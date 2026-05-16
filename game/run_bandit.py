from collections import defaultdict
from datetime import datetime, timedelta
from .bandit import MultiArmedBandit

ALPHA = 0.1
EPSILON = 0.1
VOCAB_LENGTH = 100 # DUMMY FOR NOW, SHOULD ACTUALLY BE THE USER'S
ACTIONS = ["apple", "banana", "orange"] # DUMMY FOR NOW, SHOULD ACTUALLY BE THE USER'S

agent = MultiArmedBandit(alpha=ALPHA, epsilon=EPSILON)

context = {
    "wrong_streak": 0,
    "correct_streak": 0,
}


def make_state_key(state):
    return (
        bool(state["wrong_streak"]),
        bool(state["correct_streak"]),
    )


def run_session(agent, state, actions):
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
        state_key = make_state_key(state)
        action = agent.select(state_key, actions)
        
        # simulate the action :o answer 
        answer = None

        reward = 0
        if answer:
            if start or previous:
                correct += 1
            else:
                correct = 1
                state["correct_streak"] = False
                
            times_correct[action] = times_correct[action] + 1
            reward += 1  # reward of 1 if they get it right 
                
            if not last_result[action]:
                reward += 2 # increase reward by 2 if previously they got it wrong
        else:
            if start or not previous:
                wrong += 1
            else: 
                wrong = 1
                state["wrong_streak"] = False
                
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
        
        if correct >= 3:
            state["correct_streak"] = True
        if wrong >= 3:
            state["wrong_streak"] = True
        
        
        delta = (reward / times_selected[action]) - (agent.get_q_value(state_key, action) / times_selected[action])

        agent.update_table(state_key, action, delta)


    print(episode_rewards)

    return episode_rewards
