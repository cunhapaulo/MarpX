import numpy as np
import matplotlib.pyplot as plt

# Constantes físicas (SI)
c = 3e8               # velocidade da luz no vácuo (m/s)
E0 = 1.0              # amplitude do campo elétrico (V/m) – valor arbitrário
lambda_ = 1.0         # comprimento de onda (m) – valor arbitrário

# Parâmetros de onda
k = 2 * np.pi / lambda_          # número de onda
omega = 2 * np.pi * c / lambda_  # frequência angular (ω = 2πc/λ)

# Eixo espacial e instante observado
x = np.linspace(0, 2 * lambda_, 1000)  # duas ondas completas
t = 0                                  # instante “fotografado”

# Campos E e B (B escalado por c para ficar visível)
E = E0 * np.sin(k * x - omega * t)
B = (E0 / c) * np.sin(k * x - omega * t)  # B naturalmente ≈ E0/c
B_scaled = c * B                          # escalado para comparação visual com E

# Gráfico
plt.figure(figsize=(8, 4))
plt.plot(x, E, label='Campo elétrico $E(x,t=0)$')
plt.plot(x, B_scaled, label=r'$c \, B(x,t=0)$ (escalado)')
plt.xlabel('Posição $x$ (m)')
plt.ylabel('Amplitude (unidades arbitrárias)')
plt.title('Onda eletromagnética no vácuo – instantâneo $t = 0$')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
