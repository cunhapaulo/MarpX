# -*- coding: utf-8 -*-
"""
Onda eletromagnética no vácuo – visualização 3-D
-----------------------------------------------------------------
Ilustra a relação |E| = c|B| e o carácter transversal da onda:
E oscila em y, B em z, ambos perpendiculares à direção de
propagação (x) e entre si, permanecendo em fase.
"""

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D   # registra o proj. 3-D

# --------------------- parâmetros físicos ----------------------
c   = 3.0e8        # velocidade da luz (m s⁻¹)
E0  = 1.0          # amplitude arbitrária do campo elétrico (V m⁻¹)
lam = 1.0          # comprimento de onda (m)

k = 2*np.pi/lam            # número de onda
ω = 2*np.pi*c/lam          # frequência angular

# domínios espacial e temporal
x = np.linspace(0, 2*lam, 1000)   # duas ondas completas
t = 0.0                           # instante “congelado”

# --------------------- campos E e B ----------------------------
E =  E0 * np.sin(k*x - ω*t)        # componente em y
B = (E0/c) * np.sin(k*x - ω*t)     # componente em z (antes do escalonamento)
B_plot = c * B                     # escala-se por c para comparar a E

# --------------------- figura 3-D ------------------------------
fig = plt.figure(figsize=(8, 4))
ax  = fig.add_subplot(111, projection='3d')

# linha do campo elétrico: (x, E, 0)
ax.plot(x, E, np.zeros_like(x), label='E(x, t=0)')

# linha do campo magnético escalonado: (x, 0, c B)
ax.plot(x, np.zeros_like(x), B_plot, label='c·B(x, t=0)')

# rótulos e estética
ax.set_xlabel('x (m)')
ax.set_ylabel('E (V/m)')
ax.set_zlabel('c·B (V/m)')
ax.set_title('Propagação de uma onda eletromagnética no vácuo (instantâneo 3-D)')
ax.legend()
plt.tight_layout()
plt.show()

# --------------------- dica de animação ------------------------
# Para visualizar o avanço da frente de onda, bastaria colocar o
# bloco de cálculo e plot dentro de uma função que recebe 't' e
# usar matplotlib.animation.FuncAnimation variando t = n*Δt.
