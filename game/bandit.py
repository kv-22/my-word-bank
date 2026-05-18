from collections import defaultdict
import random

class MultiArmedBandit():
    def __init__(self, alpha, table=None, epsilon=None):
        self.table = defaultdict(float)
        if table:
            self.table.update(table)
        self.alpha = alpha

    def reset(self):
        self.table.clear()
        
    def update_table(self, state, action, delta):
        self.table[(state, action)] = self.table[(state, action)] + (self.alpha * delta)
    
    def get_q_value(self, state, action):
        return self.table[(state, action)]

    def select(self, candidates, bayes_by_action, review_priority_by_action=None):
        if not candidates:
            raise ValueError("candidates must not be empty")
        review_priority_by_action = review_priority_by_action or {}
        scores = {}
        for action in candidates:
            alpha, beta = bayes_by_action.get(action, (1.0, 1.0))
            scores[action] = (
                random.betavariate(alpha, beta)
                + review_priority_by_action.get(action, 0.0)
            )
        return max(scores, key=scores.get)
