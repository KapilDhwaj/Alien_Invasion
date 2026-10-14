import matplotlib.pyplot as plt
x_values = range(1,5001)
y_values = [x**3 for x in x_values]
plt.style.use("seaborn-v0_8-talk")
fig,ax = plt.subplots()
ax.scatter(x_values , y_values , s=10 , c = y_values ,cmap=plt.cm.Blues)
ax.set_xlabel("Numbers" , fontsize = 24)
ax.set_ylabel("Cubed Numbers" , fontsize = 24)
plt.show()