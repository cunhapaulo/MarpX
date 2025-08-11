import numpy as np
import matplotlib.pyplot as plt

# Constantes físicas (SI)
c = 3e8               # velocidade da luz no vácuo (m s⁻¹)
E0 = 1.0              # amplitude arbitrária do campo elétrico (V m⁻¹)
λ  = 1.0              # comprimento de onda arbitrário (m)

# Parâmetros de onda
k     = 2 * np.pi / λ           # número de onda
ω     = 2 * np.pi * c / λ       # frequência angular (ω = 2πc/λ)
x     = np.linspace(0, 2*λ, 1_000)  # duas ondas completas
t     = 0                       # instante “fotografado”

# Campos E e B
E = E0 * np.sin(k*x - ω*t)
B = (E0/c) * np.sin(k*x - ω*t)   # B natural­mente ≈ E₀/c
B_esc = c * B                    # escalona-se por c para caber na mesma escala que E

# Gráfico
plt.plot(x, E,      label=r'$E(x,t=0)$')
plt.plot(x, B_esc,  label=r'$c\,B(x,t=0)$')
plt.xlabel('Posição $x$ (m)')
plt.ylabel('Amplitude (u. a.)')
plt.title('Onda eletromagnética no vácuo — instantâneo $t = 0$')
plt.legend()
plt.grid(True)
plt.show()
