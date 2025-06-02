from conexao import colecao_tarefas, colecao_usuarios, redis_client
from datetime import datetime, timezone
import uuid


# --- Funções de Usuário ---
def criar_usuario_func(username: str, password_plaintext: str) -> str:
    if colecao_usuarios.find_one({"username": username}):
        raise ValueError(f"Usuário com username '{username}' já existe.")
    user_uuid = str(uuid.uuid4())
    novo_usuario_doc = {
        "id_user": user_uuid, 
        "username": username,
        "password": password_plaintext, 
        "data_criacao": datetime.now(timezone.utc)
    }
    colecao_usuarios.insert_one(novo_usuario_doc)
    return user_uuid

def buscar_usuario_por_id_func(id_user_param: str) -> dict | None:
    return colecao_usuarios.find_one({"id_user": id_user_param}, {"password": 0, "_id": 0})

def buscar_usuario_por_username_func(username: str) -> dict | None:
    return colecao_usuarios.find_one({"username": username}, {"password": 0, "_id": 0})

# --- Função Auxiliar de Formatação ---

def _formatar_tarefa_para_frontend(tarefa_db: dict) -> dict | None:
    if not tarefa_db:
        return None

    comentarios_formatados = []
    if "comentarios" in tarefa_db and isinstance(tarefa_db.get("comentarios"), list):
        for comentario_db in tarefa_db.get("comentarios", []):
            com_fmt = {
                "id_comentario": comentario_db.get("id_comentario"),
                "id_autor": comentario_db.get("id_autor"),
                "comentario": comentario_db.get("comentario"),
                "data": None # Default
            }
            data_com_db = comentario_db.get("data") # Espera-se que seja datetime ou None
            if data_com_db: # Se existir (não for None), e confiamos que é datetime
                com_fmt["data"] = data_com_db.isoformat().replace("+00:00", "Z")
            comentarios_formatados.append(com_fmt)

    return {
        "id": tarefa_db.get("id"), 
        "titulo": tarefa_db.get("titulo"),
        "descricao": tarefa_db.get("descricao"),
        "status": tarefa_db.get("status"),
        "user_id": tarefa_db.get("user_id"), 
        "tags": tarefa_db.get("tags", []),
        "comentarios": comentarios_formatados,
        "data_criacao": tarefa_db.get("data_criacao").isoformat().replace("+00:00", "Z") if isinstance(tarefa_db.get("data_criacao"), datetime) else str(tarefa_db.get("data_criacao", "")),
        "data_atualizacao": tarefa_db.get("data_atualizacao").isoformat().replace("+00:00", "Z") if isinstance(tarefa_db.get("data_atualizacao"), datetime) else str(tarefa_db.get("data_atualizacao", ""))
    }

# --- Funções CRUD de Tarefas ---

def criar_tarefa(tarefa_data: dict) -> str:
    now_utc = datetime.now(timezone.utc)
    task_uuid = str(uuid.uuid4())

    user_id_criador = tarefa_data.get("user_id")
    if not user_id_criador or not buscar_usuario_por_id_func(user_id_criador):
        raise ValueError(f"ID de usuário criador ('{user_id_criador}') inválido ou não fornecido.")

    comentarios_processados = []
    for comentario_in in tarefa_data.get("comentarios", []): # Comentários podem ou não existir
        id_autor_comentario = comentario_in.get("id_autor")
        if not id_autor_comentario or not buscar_usuario_por_id_func(id_autor_comentario):
            raise ValueError(f"ID de autor ('{id_autor_comentario}') inválido em um dos comentários.")
        
        comentarios_processados.append({
            "id_comentario": str(uuid.uuid4()),
            "id_autor": id_autor_comentario,
            "comentario": comentario_in.get("comentario", ""),
            "data": now_utc # Data do comentário definida pelo backend como now_utc
        })
        
    nova_tarefa_doc = {
        "id": task_uuid,   
        "titulo": tarefa_data.get("titulo"),
        "descricao": tarefa_data.get("descricao"),
        "status": tarefa_data.get("status", "pendente"),
        "user_id": user_id_criador,
        "tags": tarefa_data.get("tags", []),
        "comentarios": comentarios_processados,
        "data_criacao": now_utc, 
        "data_atualizacao": now_utc 
    }
    
    colecao_tarefas.insert_one(nova_tarefa_doc)
    
    redis_user_segment = user_id_criador 
    initial_status = nova_tarefa_doc.get("status", "pendente")
    redis_client.incr(f"user:{redis_user_segment}:tasks:status:{initial_status}")
    today_key = now_utc.strftime("%Y-%m-%d")
    redis_client.incr(f"user:{redis_user_segment}:tasks:created_today:{today_key}")
    for tag in nova_tarefa_doc.get("tags", []):
        redis_client.zincrby(f"user:{redis_user_segment}:tags:top", 1, tag)

    return task_uuid

def listar_tarefas() -> list[dict]:
    tarefas_formatadas = []
    for tarefa_db in colecao_tarefas.find().sort("data_criacao", -1): 
        fmt = _formatar_tarefa_para_frontend(tarefa_db)
        if fmt: tarefas_formatadas.append(fmt)
    return tarefas_formatadas

def buscar_tarefa_por_id_func(task_uuid_param: str) -> dict | None:
    tarefa_db = colecao_tarefas.find_one({"id": task_uuid_param}) 
    return _formatar_tarefa_para_frontend(tarefa_db)


def atualizar_tarefa(task_uuid_param: str, dados_atualizacao: dict, solicitante_id_user: str):
    tarefa_antiga = colecao_tarefas.find_one({"id": task_uuid_param}) 
    if not tarefa_antiga:
        print(f"Erro: Tarefa com ID UUID '{task_uuid_param}' não encontrada para atualização.")
        return None 
    
    # VERIFICAÇÃO DE PERMISSÃO
    if tarefa_antiga.get("user_id") != solicitante_id_user:
        raise PermissionError(f"Usuário '{solicitante_id_user}' não autorizado a editar a tarefa '{task_uuid_param}'.")

    campos_protegidos = ['id', '_id', 'data_criacao', 'user_id'] 
    payload_set = {key: value for key, value in dados_atualizacao.items() if key not in campos_protegidos}
    
    now_utc = datetime.now(timezone.utc)
    payload_set["data_atualizacao"] = now_utc

    # Para atualizar_tarefa, a lógica de data dos comentários precisa ser mais robusta,
    # pois o frontend pode enviar comentários existentes (com suas datas originais como string)
    # e novos comentários (para os quais o backend gerará a data).
    if "comentarios" in payload_set and isinstance(payload_set["comentarios"], list):
        comentarios_processados_update = []
        ids_comentarios_existentes_na_tarefa_db = {c.get("id_comentario") for c in tarefa_antiga.get("comentarios", []) if c.get("id_comentario")}

        for comentario_in in payload_set["comentarios"]:
            id_autor_comentario = comentario_in.get("id_autor")
            if not id_autor_comentario or not buscar_usuario_por_id_func(id_autor_comentario):
                raise ValueError(f"ID de autor ('{id_autor_comentario}') inválido em um comentário para atualização.")

            id_com_payload = comentario_in.get("id_comentario") # ID do comentário vindo do payload
            
            id_com_final = id_com_payload if id_com_payload and id_com_payload in ids_comentarios_existentes_na_tarefa_db else str(uuid.uuid4())

            data_comentario_dt = now_utc # Default para novos comentários ou se a data enviada for inválida
            data_comentario_str_payload = comentario_in.get("data")

            if id_com_final == id_com_payload: # Se é um comentário existente
                if data_comentario_str_payload and isinstance(data_comentario_str_payload, str):
                    try: # Tenta usar a data enviada pelo frontend (que deve ser a original do comentário)
                        data_comentario_dt = datetime.fromisoformat(data_comentario_str_payload.replace("Z", "+00:00"))
                    except ValueError:
                        print(f"Aviso: Data de comentário existente ('{data_comentario_str_payload}') é inválida, usando data da atualização da tarefa.")
                        # Aqui, para um comentário existente cuja data veio inválida, poderíamos buscar a data original do BD
                        # ou simplesmente usar now_utc. Para simplificar a apresentação, usamos now_utc.
                # Se data_comentario_str_payload não veio para um comentário existente, pode ser um erro do frontend
                # ou uma decisão de design. Para simplificar, usaremos now_utc.
            
            comentarios_processados_update.append({
                "id_comentario": id_com_final,
                "id_autor": id_autor_comentario,
                "comentario": comentario_in.get("comentario", ""),
                "data": data_comentario_dt 
            })
        payload_set["comentarios"] = comentarios_processados_update
    
    if not payload_set: 
        if tarefa_antiga: 
             return colecao_tarefas.update_one({"id": task_uuid_param}, {"$set": {"data_atualizacao": now_utc}})
        return None

    result = colecao_tarefas.update_one({"id": task_uuid_param}, {"$set": payload_set})
    
    # Lógica Redis para métricas (mantida como antes, usando UUIDs para user_id)
    if result and result.matched_count > 0:
        redis_user_segment = str(tarefa_antiga.get("user_id", "anonimo"))
        old_status = tarefa_antiga.get("status", "pendente")
        new_status = payload_set.get("status", old_status)
        if old_status != new_status:
            redis_client.decr(f"user:{redis_user_segment}:tasks:status:{old_status}")
            redis_client.incr(f"user:{redis_user_segment}:tasks:status:{new_status}")
            if new_status == 'concluída':
                today_key_str = now_utc.strftime("%Y-%m-%d")
                redis_client.incr(f"user:{redis_user_segment}:tasks:completed:{today_key_str}")
                redis_client.expire(f"user:{redis_user_segment}:tasks:completed:{today_key_str}", 86400 * 60)
        old_tags = set(tarefa_antiga.get("tags", []))
        new_tags = set(payload_set.get("tags", old_tags if "tags" in payload_set else []))
        tags_removed = old_tags - new_tags
        tags_added = new_tags - old_tags
        for tag in tags_removed: redis_client.zincrby(f"user:{redis_user_segment}:tags:top", -1, tag)
        for tag in tags_added: redis_client.zincrby(f"user:{redis_user_segment}:tags:top", 1, tag)
    return result

def adicionar_tag_a_tarefa(task_uuid_param: str, tag_nova: str, solicitante_id_user: str):
    tarefa = colecao_tarefas.find_one({"id": task_uuid_param})
    if not tarefa:
        return None # Ou levantar erro de tarefa não encontrada
    if tarefa.get("user_id") != solicitante_id_user:
        raise PermissionError(f"Usuário '{solicitante_id_user}' não autorizado a modificar tags desta tarefa.")

    now_utc = datetime.now(timezone.utc)
    return colecao_tarefas.update_one(
        {"id": task_uuid_param}, 
        {"$addToSet": {"tags": tag_nova}, "$set": {"data_atualizacao": now_utc}}
    )

def atualizar_tag_tarefa(task_uuid_param: str, tag_antiga: str, tag_nova: str, str, solicitante_id_user: str):
    tarefa = colecao_tarefas.find_one({"id": task_uuid_param})
    if not tarefa:
        return None
    if tarefa.get("user_id") != solicitante_id_user:
        raise PermissionError(f"Usuário '{solicitante_id_user}' não autorizado a modificar tags desta tarefa.")

    now_utc = datetime.now(timezone.utc)
    result = colecao_tarefas.update_one(
        {"id": task_uuid_param, "tags": tag_antiga}, 
        {"$pull": {"tags": tag_antiga}, "$addToSet": {"tags": tag_nova}, "$set": {"data_atualizacao": now_utc}}
    )
    if result.modified_count == 0 and tag_antiga != tag_nova: 
        result = colecao_tarefas.update_one(
             {"id": task_uuid_param},
             {"$addToSet": {"tags": tag_nova}, "$set": {"data_atualizacao": now_utc}}
        )
    return result

def deletar_tarefa(task_uuid_param: str, solicitante_id_user: str):
    tarefa_a_deletar = colecao_tarefas.find_one({"id": task_uuid_param}) 
    if not tarefa_a_deletar:
        return None
    
    # VERIFICAÇÃO DE PERMISSÃO
    if tarefa_a_deletar.get("user_id") != solicitante_id_user:
        raise PermissionError(f"Usuário '{solicitante_id_user}' não autorizado a deletar a tarefa '{task_uuid_param}'.")

    result = colecao_tarefas.delete_one({"id": task_uuid_param})
    if result and result.deleted_count == 1:
        redis_user_segment = str(tarefa_a_deletar.get("user_id", "anonimo"))
        task_status = tarefa_a_deletar.get("status", "pendente")
        redis_client.decr(f"user:{redis_user_segment}:tasks:status:{task_status}")
        tags_da_tarefa_deletada = tarefa_a_deletar.get("tags", [])
        for tag in tags_da_tarefa_deletada:
            redis_client.zincrby(f"user:{redis_user_segment}:tags:top", -1, tag)
    return result

def buscar_tarefas_por_criterio(criterio: dict) -> list[dict]:
    tarefas_encontradas = []
    for tarefa_db in colecao_tarefas.find(criterio).sort("data_criacao", -1):
        fmt = _formatar_tarefa_para_frontend(tarefa_db)
        if fmt: tarefas_encontradas.append(fmt)
    return tarefas_encontradas

def adicionar_comentario(task_uuid_param: str, id_autor_param: str, comentario_texto: str):
    if not id_autor_param or not buscar_usuario_por_id_func(id_autor_param):
        raise ValueError(f"ID de autor ('{id_autor_param}') inválido para adicionar comentário.")
    now_utc = datetime.now(timezone.utc)
    novo_comentario_doc = {
        "id_comentario": str(uuid.uuid4()), 
        "id_autor": id_autor_param,    
        "comentario": comentario_texto,
        "data": now_utc 
    }
    return colecao_tarefas.update_one(
        {"id": task_uuid_param}, 
        {"$push": {"comentarios": novo_comentario_doc}, "$set": {"data_atualizacao": now_utc}}
    )

def _reset_redis_metrics():
    print("DEBUG RESET: Resetando métricas Redis...")
    for key_pattern in ["user:*:tasks:*", "user:*:stats:*", "user:*:tags:top"]:
        for key in redis_client.scan_iter(key_pattern): 
            redis_client.delete(key)
    print("DEBUG RESET: Métricas Redis resetadas.")

def _recalculate_redis_metrics():
    print("Iniciando recalculo das métricas Redis a partir do MongoDB...")
    _reset_redis_metrics()
    all_tasks_db = colecao_tarefas.find({})
    for task_db in all_tasks_db:
        redis_user_segment = str(task_db.get("user_id", "anonimo_recalc")) 
        status = task_db.get("status", "pendente")
        redis_client.incr(f"user:{redis_user_segment}:tasks:status:{status}")
        data_criacao_dt = task_db.get("data_criacao")
        if isinstance(data_criacao_dt, datetime):
            creation_date_str = data_criacao_dt.strftime("%Y-%m-%d")
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            if creation_date_str == today_str:
                redis_client.incr(f"user:{redis_user_segment}:tasks:created_today:{today_str}")
        tags_da_tarefa = task_db.get("tags", [])
        for tag in tags_da_tarefa:
            redis_client.zincrby(f"user:{redis_user_segment}:tags:top", 1, tag)
        if status == 'concluída':
            data_relevante_para_conclusao = task_db.get("data_atualizacao") 
            if isinstance(data_relevante_para_conclusao, datetime):
                completed_date_str = data_relevante_para_conclusao.strftime("%Y-%m-%d")
                redis_client.incr(f"user:{redis_user_segment}:tasks:completed:{completed_date_str}")
    print("Recalculo das métricas Redis concluído.")