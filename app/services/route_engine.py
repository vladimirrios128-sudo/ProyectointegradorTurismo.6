import networkx as nx

class RouteEngine:
    def __init__(self):
        self.graph = nx.Graph()
        self._load_sample_data()

    def _load_sample_data(self):
        nodes = [
            ("plaza_mayor", {"name": "Plaza Mayor", "category": "Historico"}),
            ("museo_arte", {"name": "Museo de Arte", "category": "Cultura"}),
            ("parque_central", {"name": "Parque Central", "category": "Naturaleza"}),
            ("mirador", {"name": "Mirador de la Ciudad", "category": "Vistas"}),
            ("mercado_local", {"name": "Mercado Local", "category": "Gastronomia"}),
        ]
        self.graph.add_nodes_from(nodes)

        edges = [
            ("plaza_mayor", "museo_arte", {"weight": 10}),
            ("plaza_mayor", "mercado_local", {"weight": 15}),
            ("museo_arte", "parque_central", {"weight": 12}),
            ("mercado_local", "parque_central", {"weight": 8}),
            ("parque_central", "mirador", {"weight": 20}),
            ("museo_arte", "mirador", {"weight": 25}),
        ]
        self.graph.add_edges_from(edges)

    def calculate_shortest_path(self, start_node: str, end_node: str):
        if start_node not in self.graph or end_node not in self.graph:
            return None
        try:
            path = nx.shortest_path(self.graph, source=start_node, target=end_node, weight="weight")
            length = nx.shortest_path_length(self.graph, source=start_node, target=end_node, weight="weight")
            detailed_path = [
                {"id": node, "name": self.graph.nodes[node]["name"], "category": self.graph.nodes[node]["category"]}
                for node in path
            ]
            return {"total_time_minutes": length, "route": detailed_path}
        except nx.NetworkXNoPath:
            return None

route_engine = RouteEngine()
