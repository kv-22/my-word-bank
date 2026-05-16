from collections import defaultdict
import random as random

class MultiArmedBandit():
    def __init__(self, alpha, epsilon, table=None):
        self.table = defaultdict(float)
        if table:
            self.table.update(table)
        self.alpha = alpha
        self.epsilon = epsilon

    def reset(self):
        self.table.clear()
        
    def update_table(self, state, action, delta):
        self.table[(state, action)] = self.table[(state, action)] + (self.alpha * delta)
    
    def get_q_value(self, state, action):
        return self.table[(state, action)]

    def get_best_action(self, state, actions):
        if not actions:
            raise ValueError("actions must not be empty")
        q_vals = [(action, self.get_q_value(state, action)) for action in actions]
        max_q = max(q_value for _, q_value in q_vals)
        best_actions = [action for action, q_value in q_vals if q_value == max_q]
        return random.choice(best_actions)

    def select(self, state, actions):
        if not actions:
            raise ValueError("actions must not be empty")
        # Select a random action with epsilon probability
        if random.random() < self.epsilon:
            return random.choice(actions)
        arg_max_q = self.get_best_action(state, actions)
        return arg_max_q
    
    
