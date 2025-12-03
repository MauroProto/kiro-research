import networkx as nx
from typing import List, Tuple

class KnowledgeGraph:
    def __init__(self):
        self.graph = nx.Graph()

    def add_entity(self, entity: str, type: str):
        """
        Add an entity node to the graph.
        """
        self.graph.add_node(entity, type=type)

    def add_relation(self, entity1: str, entity2: str, relation: str):
        """
        Add a relationship edge between two entities.
        """
        self.graph.add_edge(entity1, entity2, relation=relation)

    def get_related_entities(self, entity: str) -> List[Tuple[str, str]]:
        """
        Get entities related to the given entity.
        Returns a list of (neighbor, relation).
        """
        if entity not in self.graph:
            return []
        
        related = []
        for neighbor in self.graph.neighbors(entity):
            relation = self.graph[entity][neighbor].get('relation', 'related_to')
            related.append((neighbor, relation))
        return related
