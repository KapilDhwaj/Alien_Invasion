import plotly.express as px
from random import randint
class Die:
    """A class representing a single die."""
    def __init__(self, num_sides=6):
        """Assume a six-sided die."""
        self.num_sides = num_sides
    def roll(self):
        """"Return a random value between 1 and number of sides."""
        return randint(1, self.num_sides)
dice1 = Die()
dice2 = Die()
dice3 = Die()
# Make some rolls, and store results in a list.
results = []
for roll_num in range(1000):
    result = dice1.roll() * dice2.roll()
    results.append(result)
# Analyze the results.
frequencies = []
max_result = dice1.num_sides + dice2.num_sides
poss_results = range(2, max_result+1)
for value in poss_results:
    frequency = results.count(value)
    frequencies.append(frequency)
# Visualize the results.
title = "Results of Rolling Two D8 Dice 1,000 Times"
labels = {'x': 'Result', 'y': 'Frequency of Result'}
fig = px.bar(x=poss_results, y=frequencies, title=title, labels=labels)
fig.update_layout(xaxis_dtick=1)
fig.show()
fig.write_html('dice_visual_d6d6.html')