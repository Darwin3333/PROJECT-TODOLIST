from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timedelta, timezone
import traceback
import json

import func
from conexao import redis_client
import redis

app = FastAPI(title="API Gerenciador de Tarefas")

# Configura CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Seu frontend React
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos Pydantic ---
# Modelo base para configuração comum, especialmente para serialização de datetime
class APIBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True, # Necessário para Pydantic v2 se mapeando de objetos ORM/DB (funciona para dicts também)
        json_encoders={
            datetime: lambda dt: dt.isoformat().replace("+00:00", "Z") # Formato ISO com Z para UTC
        }
    )

# Modelos para Usuário
class UserBase(APIBaseModel):
    username: str

class UserCreate(UserBase):
    password: str # Senha em texto puro, conforme solicitado para o projeto

class UserInDB(UserBase):
    id_user: str # UUID string
    data_criacao: datetime

# Modelos para Comentário
class ComentarioBase(APIBaseModel):
    comentario: str

class ComentarioCreateInTask(ComentarioBase): # Usado ao criar/atualizar tarefa
    id_autor: str # UUID do usuário que está fazendo o comentário

class ComentarioUpdateInTask(ComentarioCreateInTask): # Usado ao atualizar tarefa, pode ter ID de comentário existente
    id_comentario: Optional[str] = None # UUID do comentário, se já existir

class ComentarioInDB(ComentarioBase):
    id_comentario: str # UUID do comentário
    id_autor: str # UUID do autor
    data: datetime

# Modelos para Tarefa
class TarefaBase(APIBaseModel):
    titulo: str
    descricao: str
    status: str = Field(default="pendente", pattern="^(pendente|em andamento|concluída)$")
    tags: List[str] = []

class TarefaCreatePayload(TarefaBase):
    user_id: str # UUID do usuário dono da tarefa
    comentarios: List[ComentarioCreateInTask] = []

class TarefaUpdatePayload(APIBaseModel): # Herdando de APIBaseModel para config
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(pendente|em andamento|concluída)$")
    tags: Optional[List[str]] = None
    # Ao atualizar, o frontend envia a lista completa de comentários como ele a vê.
    # O backend diferencia entre novos e existentes.
    comentarios: Optional[List[ComentarioUpdateInTask]] = None 

class TarefaInDB(TarefaBase):
    id: str # UUID da tarefa
    user_id: str # UUID do usuário dono da tarefa
    data_criacao: datetime
    data_atualizacao: datetime
    comentarios: List[ComentarioInDB] = []

class APIBaseModel(BaseModel): # Certifique-se que esta classe base existe ou use BaseModel
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat().replace("+00:00", "Z")
        }
    )

# NOVO MODELO para a rota /metrics/top-tags
class TopTagItem(APIBaseModel): # ou apenas BaseModel se não precisar de config especial
    tag: str
    count: int

# NOVO MODELO para a rota /metrics/completed-by-day
class CompletedByDayItem(APIBaseModel): # ou apenas BaseModel
    date: str # A data já é uma string "AAAA-MM-DD"
    count: int

class AverageCompletionTime(APIBaseModel): # Ou apenas BaseModel
    average_seconds: Optional[float] = None # Em segundos
    total_completed: int
    message: Optional[str] = None # Para casos como "Nenhuma tarefa concluída ainda"

class WeeklyCompletionRate(APIBaseModel): # Ou apenas BaseModel
    rate: Optional[float] = None # Ex: 0.75 para 75%
    tasks_created_last_7_days: int
    tasks_completed_last_7_days: int
    message: Optional[str] = None # Para casos como "Nenhuma tarefa criada na última semana"

# --- Evento de Startup ---
@app.on_event("startup")
async def startup_event():
    try:
        redis_client.ping()
        print("Conexão com Redis estabelecida com sucesso!")

        # Comente as linhas abaixo para desabilitar o recálculo no startup
        # print("Iniciando recálculo de métricas Redis no startup...")
        # func._recalculate_redis_metrics() 
        # print("Recálculo de métricas Redis concluído.")
        # print("Recálculo de métricas no startup está DESABILITADO.")

    except redis.exceptions.ConnectionError as e:
        print(f"ERRO FATAL: Não foi possível conectar ao Redis. {e}")
        # Em um cenário real, você pode querer que a aplicação não inicie.
        # raise Exception("Falha ao conectar ao Redis.") 
    # except Exception as e_recalc:
    #     print(f"ERRO durante o recálculo de métricas no startup: {e_recalc}")

# --- Rotas de Usuário ---

@app.post("/usuarios/", response_model=UserInDB, status_code=201, summary="Criar novo usuário")
async def criar_novo_usuario_rota(usuario_data: UserCreate):
    try:
        novo_user_id_uuid = func.criar_usuario_func(usuario_data.username, usuario_data.password)
        usuario_criado_doc = func.buscar_usuario_por_id_func(novo_user_id_uuid)
        if not usuario_criado_doc:
            raise HTTPException(status_code=500, detail="Erro ao recuperar usuário recém-criado.")
        return UserInDB(**usuario_criado_doc)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao criar usuário: {str(e)}")

@app.get("/usuarios/{id_user_param}", response_model=UserInDB, summary="Buscar usuário por ID")
async def buscar_usuario_rota(id_user_param: str):
    try:
        usuario_doc = func.buscar_usuario_por_id_func(id_user_param)
        if not usuario_doc:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        return UserInDB(**usuario_doc)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao buscar usuário: {str(e)}")


# --- Rotas da API ---

# Rota raiz (opcional, mas bom para testar se a API está de pé)
@app.get("/")
async def read_root():
    return {"message": "API de Tarefas funcionando! Acesse /docs para a documentação."}

@app.post("/tarefas/", response_model=TarefaInDB, status_code=201, summary="Criar nova tarefa")
async def criar_nova_tarefa_rota(tarefa_payload: TarefaCreatePayload):
    try:
        # O payload já vem validado pelo Pydantic
        tarefa_data_dict = tarefa_payload.model_dump()
        tarefa_uuid = func.criar_tarefa(tarefa_data_dict)
        tarefa_criada_dict = func.buscar_tarefa_por_id_func(tarefa_uuid)
        if not tarefa_criada_dict:
            raise HTTPException(status_code=500, detail="Erro ao recuperar tarefa criada.")
        return TarefaInDB(**tarefa_criada_dict)
    except ValueError as ve: # Captura ValueErrors de func.py (ex: user_id inválido)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"Erro interno ao criar tarefa: {str(e)}")

@app.get("/tarefas/", response_model=List[TarefaInDB], summary="Listar todas as tarefas")
async def listar_todas_tarefas_rota():
    try:
        tarefas_list_dict = func.listar_tarefas()
        return [TarefaInDB(**tarefa_dict) for tarefa_dict in tarefas_list_dict]
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao listar tarefas: {str(e)}")

@app.get("/tarefas/buscar/", response_model=List[TarefaInDB], summary="Buscar tarefas por critérios")
async def buscar_tarefas_por_criterio_rota(
    status: Optional[str] = Query(default=None, pattern="^(pendente|em andamento|concluída)$"),
    data_criacao_str: Optional[str] = Query(default=None, description="Formato AAAA-MM-DD", alias="data_criacao"),
    tag: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None, description="ID (UUID) do usuário") 
):
    try:
        filtro: Dict[str, any] = {}
        if status:
            filtro["status"] = status
        if data_criacao_str:
            try:
                # Converte a string "AAAA-MM-DD" para um intervalo de datetime UTC
                start_date = datetime.strptime(data_criacao_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                end_date = start_date + timedelta(days=1)
                filtro["data_criacao"] = {"$gte": start_date, "$lt": end_date}
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de data inválido para 'data_criacao'. Use AAAA-MM-DD.")
        if tag:
            filtro["tags"] = tag # Procura se a tag está no array de tags
        if user_id:
            filtro["user_id"] = user_id # Filtra pelo ID do usuário (UUID)

        # Permite busca sem filtros para listar todas, ou exige filtro se preferir
        # if not filtro:
        #     raise HTTPException(status_code=400, detail="Forneça ao menos um critério de busca.")

        tarefas_list_dict = func.buscar_tarefas_por_criterio(filtro)
        if not tarefas_list_dict and any(filtro.values()): # Se houve filtro e nada foi encontrado
             return [] # Retorna lista vazia em vez de erro, o frontend trata "nenhum resultado"
        return [TarefaInDB(**tarefa_dict) for tarefa_dict in tarefas_list_dict]
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao buscar tarefas: {str(e)}")

@app.get("/tarefas/{task_uuid_param}", response_model=TarefaInDB, summary="Obter tarefa por ID")
async def obter_tarefa_por_id_rota(task_uuid_param: str):
    try: 
        tarefa_dict = func.buscar_tarefa_por_id_func(task_uuid_param)
        if tarefa_dict:
            return TarefaInDB(**tarefa_dict)
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao obter tarefa: {str(e)}")

@app.put("/tarefas/{task_uuid_param}", response_model=TarefaInDB, summary="Atualizar tarefa existente")
async def atualizar_tarefa_existente_rota(
    task_uuid_param: str,
    tarefa_update_payload: TarefaUpdatePayload,
    solicitante_id_user: str = Query(..., description="ID (UUID) do usuário que está fazendo a requisição") # Este parâmetro é crucial
):
    try:
        # Validação opcional do solicitante (boa prática)
        if not func.buscar_usuario_por_id_func(solicitante_id_user):
            raise HTTPException(status_code=404, detail=f"Usuário solicitante com ID '{solicitante_id_user}' não encontrado.")

        dados_para_atualizar = tarefa_update_payload.model_dump(exclude_unset=True)
        
        # Lógica para quando o payload de atualização está vazio (apenas para atualizar data_atualizacao)
        if not dados_para_atualizar and not tarefa_update_payload.comentarios: # Ajuste na condição
            tarefa_existente_dict = func.buscar_tarefa_por_id_func(task_uuid_param)
            if not tarefa_existente_dict:
                 raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
            
            # Chama atualizar_tarefa passando o solicitante_id_user
            func.atualizar_tarefa(task_uuid_param, {}, solicitante_id_user) # <--- PONTO IMPORTANTE
            
            tarefa_rebuscada_dict = func.buscar_tarefa_por_id_func(task_uuid_param)
            if tarefa_rebuscada_dict: return TarefaInDB(**tarefa_rebuscada_dict)
            raise HTTPException(status_code=500, detail="Erro ao rebuscar tarefa após atualização mínima.")

        # Chamada principal para atualizar_tarefa
        resultado_update = func.atualizar_tarefa(
            task_uuid_param, 
            dados_para_atualizar, 
            solicitante_id_user # <--- PASSANDO O ARGUMENTO AQUI
        )
        
        if resultado_update is None:
             raise HTTPException(status_code=404, detail="Tarefa não encontrada para atualização (retorno None de func).")
        if resultado_update.matched_count == 0:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada para atualização (match count 0).")

        tarefa_atualizada_dict = func.buscar_tarefa_por_id_func(task_uuid_param)
        if tarefa_atualizada_dict:
            return TarefaInDB(**tarefa_atualizada_dict)
        raise HTTPException(status_code=500, detail="Tarefa alterada, mas não pôde ser recuperada.")

    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        import traceback # Adicione no topo do arquivo se não estiver
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao atualizar tarefa: {str(e)}")

@app.delete("/tarefas/{task_uuid_param}", status_code=204, summary="Deletar tarefa") 
async def deletar_tarefa_rota(
    task_uuid_param: str,
    solicitante_id_user: str = Query(..., description="ID (UUID) do usuário que está fazendo a requisição") # Parâmetro de query
):
    try:
        # Validação opcional do solicitante (boa prática)
        if not func.buscar_usuario_por_id_func(solicitante_id_user):
            raise HTTPException(status_code=404, detail=f"Usuário solicitante com ID '{solicitante_id_user}' não encontrado.")

        # Passa o solicitante_id_user para a função do backend
        resultado_delete = func.deletar_tarefa(task_uuid_param, solicitante_id_user) 
        
        if resultado_delete is None: 
            # Isso acontece se func.deletar_tarefa retornou None (tarefa não encontrada antes da verificação de permissão)
            raise HTTPException(status_code=404, detail="Tarefa não encontrada para deleção.")
        
        if resultado_delete.deleted_count == 0:
            # Se chegou aqui, a tarefa existia, a permissão foi verificada (ou deveria ter sido),
            # mas a operação de delete não afetou nenhum documento.
            # Isso pode acontecer se a tarefa foi deletada por outra requisição entre a busca e o delete,
            # ou se a verificação de permissão em func.deletar_tarefa não levantou exceção mas impediu o delete.
            # Para ser mais robusto, verificamos se a tarefa ainda existe.
            if func.buscar_tarefa_por_id_func(task_uuid_param):
                 # Se a tarefa ainda existe, pode ter sido um erro de permissão não capturado como exceção
                 # ou uma condição de corrida.
                 # Se func.deletar_tarefa levanta PermissionError corretamente, este caso é menos provável.
                raise HTTPException(status_code=403, detail="Não foi possível deletar a tarefa. Verifique as permissões ou se a tarefa ainda existe.")
            else:
                # A tarefa não existe mais, então a deleção pode ser considerada "bem-sucedida" no sentido de que o estado final é o desejado.
                # No entanto, o deleted_count foi 0, o que é estranho se ela existia antes.
                # Para um 204, é melhor garantir que houve uma deleção.
                # Se a tarefa já não existia, um 404 seria mais apropriado.
                # Como func.deletar_tarefa já verifica se a tarefa existe e levanta PermissionError,
                # um deleted_count == 0 aqui, após um resultado_delete não nulo, é um cenário incomum.
                # Vamos assumir que se resultado_delete não é None e deleted_count é 0, a tarefa não foi encontrada
                # ou a permissão falhou de uma forma que não levantou exceção (o que não deveria acontecer com o PermissionError).
                raise HTTPException(status_code=404, detail="Tarefa não encontrada ou não pôde ser deletada.")


        # Se deleted_count == 1, sucesso, retorna 204 (No Content)
        # FastAPI lida com o retorno None para status 204 automaticamente.
        return None 

    except PermissionError as pe: # Captura o erro de permissão de func.deletar_tarefa
        raise HTTPException(status_code=403, detail=str(pe))
    except HTTPException as http_exc: # Re-levanta HTTPExceptions já tratadas
        raise http_exc
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao deletar tarefa: {str(e)}")

@app.post("/tarefas/{task_uuid_param}/comentarios/", response_model=TarefaInDB, status_code=201, summary="Adicionar comentário a uma tarefa")
async def adicionar_comentario_rota(task_uuid_param: str, comentario_payload: ComentarioCreateInTask, current_user_id: str = Query(..., description="ID do usuário logado que está comentando")):
    # Em um sistema real, current_user_id viria de um token de autenticação (ex: Depends(get_current_user))
    # Para a apresentação, passamos como query parameter ou assumimos que já está no comentario_payload.
    # Vou assumir que o comentario_payload já tem id_autor, conforme ComentarioCreateInTask.
    try:
        # Validar se o id_autor do comentário corresponde ao usuário "logado" (se essa lógica for necessária)
        # ou se o id_autor no payload é confiável.
        # Para este exemplo, confiamos no id_autor do payload.
        if not func.buscar_usuario_por_id_func(comentario_payload.id_autor):
             raise HTTPException(status_code=400, detail=f"ID de autor '{comentario_payload.id_autor}' inválido.")

        resultado_add = func.adicionar_comentario(task_uuid_param, comentario_payload.id_autor, comentario_payload.comentario)
        
        if resultado_add and resultado_add.modified_count == 1:
            tarefa_atualizada_dict = func.buscar_tarefa_por_id_func(task_uuid_param)
            if tarefa_atualizada_dict:
                return TarefaInDB(**tarefa_atualizada_dict)
            raise HTTPException(status_code=500, detail="Comentário adicionado, mas tarefa não pôde ser recuperada.")
        
        tarefa_existe = func.buscar_tarefa_por_id_func(task_uuid_param)
        if not tarefa_existe:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada para adicionar comentário.")
        else:
            raise HTTPException(status_code=400, detail="Erro ao adicionar comentário ou tarefa não foi modificada.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao adicionar comentário: {str(e)}")

# (Rotas de Tags podem ser ajustadas similarmente se forem mantidas separadas)
# Por simplicidade, a atualização de tags está embutida em atualizar_tarefa_existente_rota

# --- NOVO: Rotas de Métricas Redis ---

@app.get("/metrics/status", response_model=Dict[str, int], summary="Contagem de tarefas por status para um usuário")
async def get_tasks_by_status_metrics(user_id: str = Query(..., description="ID (UUID) do usuário")):
    # Valida se o usuário existe (opcional, mas bom)
    if not func.buscar_usuario_por_id_func(user_id):
        raise HTTPException(status_code=404, detail=f"Usuário com ID '{user_id}' não encontrado.")
        
    statuses = ["pendente", "em andamento", "concluída"]
    metrics: Dict[str, int] = {}
    for status_val in statuses:
        key = f"user:{user_id}:tasks:status:{status_val}"
        count = redis_client.get(key)
        metrics[status_val] = int(count) if count else 0
    return metrics

@app.get("/metrics/tasks-created-today", response_model=Dict[str, int], summary="Tarefas criadas hoje por um usuário")
async def get_tasks_created_today_metrics(user_id: str = Query(..., description="ID (UUID) do usuário")):
    if not func.buscar_usuario_por_id_func(user_id):
        raise HTTPException(status_code=404, detail=f"Usuário com ID '{user_id}' não encontrado.")

    today_key_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"user:{user_id}:tasks:created_today:{today_key_str}"
    count = redis_client.get(key)
    return {"count": int(count) if count else 0}

@app.get("/metrics/top-tags", response_model=List[TopTagItem], summary="Tags mais usadas por um usuário")
async def get_top_tags_metrics(user_id: str = Query(..., description="ID (UUID) do usuário"), count: int = Query(5, gt=0, le=20)):
    if not func.buscar_usuario_por_id_func(user_id):
        raise HTTPException(status_code=404, detail=f"Usuário com ID '{user_id}' não encontrado.")

    top_tags_raw = redis_client.zrevrange(f"user:{user_id}:tags:top", 0, count - 1, withscores=True)    
    return [{"tag": tag_name, "count": int(score)} for tag_name, score in top_tags_raw]

@app.get("/metrics/completed-by-day", response_model=List[CompletedByDayItem], summary="Tarefas concluídas por dia por um usuário")
async def get_completed_tasks_by_day_metrics(user_id: str = Query(..., description="ID (UUID) do usuário"), days: int = Query(7, gt=0, le=90)):
    if not func.buscar_usuario_por_id_func(user_id):
        raise HTTPException(status_code=404, detail=f"Usuário com ID '{user_id}' não encontrado.")
        
    completed_by_day: List[Dict[str, any]] = []
    base_date = datetime.now(timezone.utc)
    for i in range(days):
        current_date = base_date - timedelta(days=i)
        date_key_str = current_date.strftime("%Y-%m-%d")
        key = f"user:{user_id}:tasks:completed:{date_key_str}"
        count = redis_client.get(key)
        completed_by_day.append({"date": date_key_str, "count": int(count) if count else 0})
    return list(reversed(completed_by_day))

# --- NOVAS ROTAS DE MÉTRICAS ---

@app.get("/metrics/average-completion-time", response_model=AverageCompletionTime, summary="Tempo médio de conclusão de tarefas para um utilizador")
async def get_average_completion_time_metrics(user_id: str = Query(..., description="ID (UUID) do utilizador")):
    if not func.buscar_usuario_por_id_func(user_id):
        raise HTTPException(status_code=404, detail=f"Utilizador com ID '{user_id}' não encontrado.")

    total_time_str = redis_client.get(f"user:{user_id}:stats:total_completion_time_seconds")
    total_completed_str = redis_client.get(f"user:{user_id}:stats:total_completed_tasks_count")

    total_time = float(total_time_str) if total_time_str else 0.0
    total_completed = int(total_completed_str) if total_completed_str else 0

    if total_completed == 0:
        return AverageCompletionTime(
            average_seconds=None, 
            total_completed=0,
            message="Nenhuma tarefa foi concluída ainda."
        )
    
    average_seconds = total_time / total_completed
    return AverageCompletionTime(
        average_seconds=average_seconds,
        total_completed=total_completed
    )

@app.get("/metrics/weekly-completion-rate", response_model=WeeklyCompletionRate, summary="Taxa de conclusão semanal de tarefas para um utilizador")
async def get_weekly_completion_rate_metrics(user_id: str = Query(..., description="ID (UUID) do utilizador")):
    if not func.buscar_usuario_por_id_func(user_id):
        raise HTTPException(status_code=404, detail=f"Utilizador com ID '{user_id}' não encontrado.")

    tasks_created_last_7_days = 0
    tasks_completed_last_7_days = 0
    today = datetime.now(timezone.utc).date() # Apenas a data, sem a hora

    for i in range(7): # Hoje e os 6 dias anteriores
        current_eval_date = today - timedelta(days=i)
        date_key_str = current_eval_date.strftime("%Y-%m-%d")
        
        # Tarefas criadas no dia
        created_count_str = redis_client.get(f"user:{user_id}:tasks:created_today:{date_key_str}")
        tasks_created_last_7_days += int(created_count_str) if created_count_str else 0
        
        # Tarefas concluídas no dia
        completed_count_str = redis_client.get(f"user:{user_id}:tasks:completed:{date_key_str}")
        tasks_completed_last_7_days += int(completed_count_str) if completed_count_str else 0

    if tasks_created_last_7_days == 0:
        return WeeklyCompletionRate(
            rate=None,
            tasks_created_last_7_days=0,
            tasks_completed_last_7_days=tasks_completed_last_7_days,
            message="Nenhuma tarefa criada na última semana para calcular a taxa."
        )
        
    completion_rate = (tasks_completed_last_7_days / tasks_created_last_7_days) if tasks_created_last_7_days > 0 else 0.0
    
    return WeeklyCompletionRate(
        rate=completion_rate,
        tasks_created_last_7_days=tasks_created_last_7_days,
        tasks_completed_last_7_days=tasks_completed_last_7_days
    )
