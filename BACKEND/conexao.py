from pymongo import MongoClient

cliente  = MongoClient('mongodb://localhost:27017/')
db = cliente['lista_tarefas']
colecao_tarefas = db['tarefas']

