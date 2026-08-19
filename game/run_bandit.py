from collections import defaultdict
from datetime import datetime, timedelta
from .bandit import MultiArmedBandit

ALPHA = 0.1
EPSILON = 0.1
VOCAB_LENGTH = 100 # DUMMY FOR NOW, SHOULD ACTUALLY BE THE USER'S
ACTIONS = ["apple", "banana", "orange"] # DUMMY FOR NOW, SHOULD ACTUALLY BE THE USER'S

agent = MultiArmedBandit(alpha=ALPHA, epsilon=EPSILON)

def run_session(agent, actions):
    agent.reset()

    times_selected = defaultdict(int)
    times_correct = defaultdict(int)
    times_wrong = defaultdict(int)
    timestamp = defaultdict(lambda: None)
    last_result = defaultdict(bool)

    episode_length = 5 # DUMMY FOR NOW, SHOULD BE ENDED BY USER
    episode_rewards = []
    wrong = 0
    correct = 0
    previous = None
    start = True
    
    for _ in range(episode_length):
        action = agent.select(actions)
        
        # simulate the action :o answer 
        answer = None

        reward = 0
        if answer:
            if start or previous:
                correct += 1
            else:
                correct = 1
                
            times_correct[action] = times_correct[action] + 1
            reward += 1  # reward of 1 if they get it right 
                
            if not last_result[action]:
                reward += 2 # increase reward by 2 if previously they got it wrong
        else:
            if start or not previous:
                wrong += 1
            else: 
                wrong = 1
                
            times_wrong[action] = times_wrong[action] + 1
            reward += 5 # reward od 5 if they get it wrong (good choice as they haven't learnt it)
            
            if last_result[action]:
                reward += 1 # increase reward by 1 if previously they got it right but now wrong (forgotten)
                if  datetime.now() - timestamp[action] >= timedelta(days=7):
                    reward += 3 # increase reward by 3 if they get it wrong after delay 
        
        times_selected[action] = times_selected[action] + 1
        last_result[action] = answer
        timestamp[action] = datetime.now()
        
        episode_rewards += [reward]
        
        previous = answer
        start = False
        
        delta = (reward / times_selected[action]) - (agent.get_q_value(action) / times_selected[action])

        agent.update_table(action, delta)


    print(episode_rewards)

    return episode_rewards
