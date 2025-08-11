# -*- coding: utf-8 -*-
"""
Onda eletromagnética no vácuo – animação 3-D
-----------------------------------------------------------------
Versão animada mostrando a propagação da onda EM com campos E e B
perpendiculares entre si e à direção de propagação.
"""

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from matplotlib.animation import FuncAnimation

# --------------------- parâmetros físicos ----------------------
c = 3.0e8        # velocidade da luz (m/s)
E0 = 1.0         # amplitude do campo elétrico (V/m)
lam = 1.0        # comprimento de onda (m)

k = 2*np.pi/lam  # número de onda
ω = 2*np.pi*c/lam  # frequência angular

# domínios espacial e temporal
x = np.linspace(0, 2*lam, 200)  # duas ondas completas
t_values = np.linspace(0, 2*np.pi/ω, 60)  # um período completo

# --------------------- configuração da figura ------------------
fig = plt.figure(figsize=(10, 6))
ax = fig.add_subplot(111, projection='3d')

# Linhas iniciais vazias que serão atualizadas
line_E, = ax.plot([], [], [], 'r', lw=2, label='E(x,t) (V/m)')
line_B, = ax.plot([], [], [], 'b', lw=2, label='c·B(x,t) (V/m)')

# Configurações dos eixos
ax.set_xlim(0, 2*lam)
ax.set_ylim(-1.2*E0, 1.2*E0)
ax.set_zlim(-1.2*E0, 1.2*E0)
ax.set_xlabel('x (m)')
ax.set_ylabel('E (V/m)')
ax.set_zlabel('c·B (V/m)')
ax.set_title('Propagação de onda eletromagnética no vácuo (3-D)')
ax.legend()
ax.grid(True)
ax.view_init(elev=30, azim=45)  # Ângulo de visualização

# --------------------- função de animação ----------------------
def update(t):
    # Campos E e B no instante t
    E = E0 * np.sin(k*x - ω*t)
    B_plot = E0 * np.sin(k*x - ω*t)  # Já escalonado por c
    
    # Atualiza os dados das linhas
    line_E.set_data(x, E)
    line_E.set_3d_properties(np.zeros_like(x))
    
    line_B.set_data(x, np.zeros_like(x))
    line_B.set_3d_properties(B_plot)
    
    return line_E, line_B

# Cria a animação
animacao = FuncAnimation(fig, update, frames=t_values,
                    interval=50, blit=True)

plt.tight_layout()
plt.show()

# Para salvar a animação (descomente se necessário):
# animacao.save('eletromag-plot-3d.mp4', writer='ffmpeg', fps=30, dpi=300)
# animacao.save('eletromag-plot-3d.gif', writer='pillow', fps=15)