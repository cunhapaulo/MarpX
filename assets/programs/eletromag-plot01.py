import numpy as np
import matplotlib.pyplot as plt

# Constantes e parâmetros
c = 3e8
E0 = 1.0
lambda_ = 1.0
k = 2 * np.pi / lambda_
omega = 2 * np.pi * c / lambda_

x = np.linspace(0, 2 * lambda_, 1000)
t = 0

E = E0 * np.sin(k * x - omega * t)
B = (E0 / c) * np.sin(k * x - omega * t)
B_scaled = c * B  # para visualização

plt.plot(x, E, label='E(x, t=0)')
plt.plot(x, B_scaled, label='c·B(x, t=0)')
plt.xlabel('x (m)')
plt.ylabel('Amplitude (u.a.)')
plt.title('Propagação de onda eletromagnética no vácuo (instantâneo)')
plt.legend()
plt.grid(True)
plt.show()
