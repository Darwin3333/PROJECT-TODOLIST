from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
# Removendo BeforeValidator, PlainSerializer, Annotated, PyObjectId, pois não são mais necessários
from pydantic import BaseModel, Field, ConfigDict, field_validator # Adicionado field_validator
from typing import List, Optional 
from datetime import datetime
import traceback 

# Importa as funções do seu func.py modificado
from func import (
    criar_tarefa,
    listar_tarefas,
    buscar_tarefa_por_id,
    atualizar_tarefa,
    adicionar_tag_a_tarefa,
    atualizar_tag_tarefa,
    deletar_tarefa,
    buscar_tarefas_por_criterio,
    adicionar_comentario
)
from bson import ObjectId # Necessário para lidar com IDs do MongoDB

app = FastAPI()

# Configura CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Seu frontend React
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos Pydantic ---

# REMOVEMOS A CLASSE PyObjectId INTEIRA.
# O ID será tratado como 'str' diretamente no modelo TarefaInDB,
# com um validador e json_encoders para lidar com ObjectId do MongoDB.


class Comentario(BaseModel):
    autor: str
    comentario: str
    data: Optional[datetime] = Field(None, description="Data e hora do comentário (gerada pelo servidor se não fornecida)")

class TarefaBase(BaseModel):
    titulo: str
    descricao: str # Mantém como obrigatória
    status: str = Field("pendente", pattern="^(pendente|em andamento|concluída)$") # Validação de status
    tags: List[str] = []
    user_id: Optional[str] = None
    comentarios: List[Comentario] = [] # <--- GARANTA QUE ESTA LINHA ESTÁ AQUI

class TarefaCreate(TarefaBase):
    user_id: str

class TarefaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(pendente|em andamento|concluída)$")
    tags: Optional[List[str]] = None
    # ESTE É O CAMPO CRUCIAL PARA ATUALIZAÇÃO
    comentarios: Optional[List[Comentario]] = None # <--- GARANTA QUE ESTA LINHA ESTÁ AQUI



class TarefaInDB(TarefaBase):
    # Definimos 'id' como string, e usamos 'alias="_id"' para o Pydantic entender
    # que o campo '_id' do MongoDB deve ser mapeado para 'id' no Python.
    id: str  
    data_criacao: str
    comentarios: List[Comentario] = []

    # Configurações para Pydantic v2
    model_config = ConfigDict(
        populate_by_name=True, # Permite que o _id vindo do DB seja mapeado para 'id' no modelo
        arbitrary_types_allowed=True, # Permite que o Pydantic lide com tipos não-pydantic como ObjectId
        
        # ESSENCIAL: Diz ao Pydantic como serializar (converter para JSON) um ObjectId para string.
        # Isso garante que quando o FastAPI retornar um objeto com ObjectId, ele será transformado em string.
        json_encoders={ObjectId: str}, 
    )

    # VALIDADOR DE CAMPO: Garante que, antes da validação do tipo 'str' para 'id',
    # se o valor for um ObjectId (vindo do MongoDB), ele seja convertido para string.
    # Isso cobre cenários onde o ObjectId pode não ser convertido automaticamente.
    @field_validator('id', mode='before')
    @classmethod
    def convert_id_to_str(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        return v


# --- Rotas da API ---

# Rota raiz (opcional, mas bom para testar se a API está de pé)
@app.get("/")
async def read_root():
    return {"message": "API de Tarefas funcionando! Acesse /docs para a documentação."}

@app.post("/tarefas/", response_model=TarefaInDB, status_code=201)
async def criar_nova_tarefa_rota(tarefa: TarefaCreate):
    """
    Cria uma nova tarefa.
    """
    try:
        tarefa_data = tarefa.model_dump() 
        tarefa_id = criar_tarefa(tarefa_data)
        
        # Buscar a tarefa recém-criada garante que temos todos os campos padrão do DB
        # e que o Pydantic pode processá-la via TarefaInDB.
        tarefa_criada = buscar_tarefa_por_id(str(tarefa_id))
        if not tarefa_criada:
            raise HTTPException(status_code=500, detail="Erro ao recuperar tarefa criada.")
        
        # Aqui o Pydantic pegará 'tarefa_criada' (que tem '_id' como chave)
        # e, graças a 'id: str = Field(alias="_id")' e 'json_encoders',
        # irá serializar para JSON com a chave 'id' e o valor como string.
        return TarefaInDB(**tarefa_criada) 
    except Exception as e:
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"Erro ao criar tarefa: {str(e)}")

@app.get("/tarefas/", response_model=List[TarefaInDB])
async def listar_todas_tarefas_rota():
    """
    Lista todas as tarefas.
    """
    try:
        tarefas = listar_tarefas()
        # Ao iterar e criar TarefaInDB para cada 'tarefa', o Pydantic fará a mágica de serialização.
        return [TarefaInDB(**tarefa) for tarefa in tarefas]
    except Exception as e:
        traceback.print_exc()
        print(f"ERRO: Detalhes do erro na rota /tarefas/: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@app.get("/tarefas/{tarefa_id}", response_model=TarefaInDB)
async def obter_tarefa_por_id_rota(tarefa_id: str):
    """
    Obtém uma tarefa específica pelo ID.
    """
    try: 
        tarefa = buscar_tarefa_por_id(tarefa_id)
        if tarefa:
            return TarefaInDB(**tarefa)
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao obter tarefa: {str(e)}")


@app.put("/tarefas/{tarefa_id}", response_model=TarefaInDB)
async def atualizar_tarefa_existente_rota(tarefa_id: str, tarefa_update: TarefaUpdate):
    """
    Atualiza uma tarefa existente.
    """
    try:
        dados_para_atualizar = {k: v for k, v in tarefa_update.model_dump(exclude_unset=True).items() if v is not None} 
        if not dados_para_atualizar:
            raise HTTPException(status_code=400, detail="Nenhum dado para atualizar fornecido.")

        resultado = atualizar_tarefa(tarefa_id, dados_para_atualizar)
        if resultado and resultado.modified_count == 1:
            tarefa_atualizada = buscar_tarefa_por_id(tarefa_id)
            if tarefa_atualizada:
                return TarefaInDB(**tarefa_atualizada)
            raise HTTPException(status_code=500, detail="Tarefa atualizada, mas não pôde ser recuperada.")
        
        tarefa_existente = buscar_tarefa_por_id(tarefa_id)
        if tarefa_existente:
            raise HTTPException(status_code=400, detail="Tarefa não foi modificada (dados idênticos ou erro).")
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar tarefa: {str(e)}")


@app.delete("/tarefas/{tarefa_id}", status_code=204) 
async def deletar_tarefa_rota(tarefa_id: str):
    """
    Deleta uma tarefa.
    """
    print(f"DEBUG: DELETE - Requisição recebida para tarefa_id: {tarefa_id}")
    try:
        resultado = deletar_tarefa(tarefa_id)
        if resultado and resultado.deleted_count == 1:
            return {"message": "Tarefa deletada com sucesso."}
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar tarefa: {str(e)}")


@app.post("/tarefas/{tarefa_id}/comentarios/", status_code=201)
async def adicionar_comentario_rota(tarefa_id: str, comentario: Comentario):
    """
    Adiciona um comentário a uma tarefa específica.
    """
    try:
        resultado = adicionar_comentario(tarefa_id, comentario.autor, comentario.comentario)
        if resultado and resultado.modified_count == 1:
            return {"message": "Comentário adicionado com sucesso."}
        raise HTTPException(status_code=404, detail="Tarefa não encontrada ou erro ao adicionar comentário.")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao adicionar comentário: {str(e)}")


@app.put("/tarefas/{tarefa_id}/tags/", response_model=TarefaInDB)
async def adicionar_ou_atualizar_tag_rota(tarefa_id: str, tag_antiga: Optional[str] = Query(None), tag_nova: str = Query(...)):
    """
    Adiciona uma nova tag ou atualiza uma tag existente em uma tarefa.
    Se 'tag_antiga' for fornecida, ela será substituída por 'tag_nova'.
    Caso contrário, 'tag_nova' será adicionada.
    """
    try:
        if tag_antiga:
            resultado = atualizar_tag_tarefa(tarefa_id, tag_antiga, tag_nova)
            if resultado and resultado.modified_count == 1:
                tarefa_atualizada = buscar_tarefa_por_id(tarefa_id)
                if tarefa_atualizada:
                    return TarefaInDB(**tarefa_atualizada)
                raise HTTPException(status_code=500, detail="Tag atualizada, mas tarefa não pôde ser recuperada.")
            elif resultado and resultado.modified_count == 0:
                raise HTTPException(status_code=400, detail=f"Tag '{tag_antiga}' não encontrada na tarefa ou '{tag_nova}' já existe.")
        else:
            resultado = adicionar_tag_a_tarefa(tarefa_id, tag_nova)
            if resultado and resultado.modified_count == 1:
                tarefa_atualizada = buscar_tarefa_por_id(tarefa_id)
                if tarefa_atualizada:
                    return TarefaInDB(**tarefa_atualizada)
                raise HTTPException(status_code=500, detail="Tag adicionada, mas tarefa não pôde ser recuperada.")
            elif resultado and resultado.modified_count == 0:
                raise HTTPException(status_code=400, detail=f"Tag '{tag_nova}' já existe na tarefa.")
        
        raise HTTPException(status_code=404, detail="Tarefa ou tag não encontrada/atualizada.")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao gerenciar tags: {str(e)}")


@app.get("/tarefas/buscar/", response_model=List[TarefaInDB])
async def buscar_tarefas_por_criterio_rota(
    status: Optional[str] = Query(None, pattern="^(pendente|em andamento|concluída)$"),
    data_criacao: Optional[str] = Query(None, description="Formato AAAA-MM-DD"),
    tag: Optional[str] = Query(None)
):
    """
    Busca tarefas por status, data de criação ou tag.
    Pode usar um ou mais parâmetros de busca.
    """
    try:
        filtro = {}
        if status:
            filtro["status"] = status
        if data_criacao:
            try:
                filtro["data_criacao"] = {"$regex": f"^{data_criacao}"} 
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de data inválido. Use AAAA-MM-DD.")
        if tag:
            filtro["tags"] = {"$in": [tag]}

        if not filtro:
            raise HTTPException(status_code=400, detail="Forneça ao menos um critério de busca (status, data_criacao ou tag).")

        tarefas = buscar_tarefas_por_criterio(filtro)
        return [TarefaInDB(**tarefa) for tarefa in tarefas]
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao buscar tarefas: {str(e)}")