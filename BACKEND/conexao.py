from pymongo import MongoClient
import redis

# Configuração do MongoDB
cliente  = MongoClient('mongodb://localhost:27017/')
db = cliente['lista_tarefas']
colecao_tarefas = db['tarefas']
colecao_usuarios = db['usuarios']

# Configuração do Redis
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
