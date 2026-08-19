from collections import defaultdict
import random as random

class MultiArmedBandit:
    def __init__(self, alpha, epsilon, table=None):
        self.table = defaultdict(float)
        if table:
            self.table.update(table)
        self.alpha = alpha
        self.epsilon = epsilon

    def reset(self):
        self.table.clear()
        
    def update_table(self, action, delta):
        self.table[action] = self.table[action] + (self.alpha * delta)
    
    def get_q_value(self, action):
        return self.table[action]

    def get_best_action(self, actions):
        if not actions:
            raise ValueError("actions must not be empty")
        q_vals = [(action, self.get_q_value(action)) for action in actions]
        max_q = max(q_value for _, q_value in q_vals)
        best_actions = [action for action, q_value in q_vals if q_value == max_q]
        return random.choice(best_actions)

    def select(self, actions):
        action, _ = self.select_with_strategy(actions)
        return action

    def select_with_strategy(self, actions):
        if not actions:
            raise ValueError("actions must not be empty")
        # Select a random action with epsilon probability
        if random.random() < self.epsilon:
            return random.choice(actions), "explore"
        arg_max_q = self.get_best_action(actions)
        return arg_max_q, "exploit"
    
    
