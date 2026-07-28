/** @type {import('tailwindcss').Config} */
// Design system "Chama Aí" — aterrado no Marajó, não no default cream+serif.
// verde-igarapé (confiança) · laranja-tucupi (ação) · amarelo-sol (destaque)
// areia quente (fundo) · tinta (texto). Tipografia redonda e legível.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        igarape:  { DEFAULT: '#1B7A5A', escuro: '#155F46', claro: '#2FA574' },
        tucupi:   { DEFAULT: '#F2760C', escuro: '#C85F06', claro: '#FF9840' },
        sol:      { DEFAULT: '#FFC24B' },
        areia:    { DEFAULT: '#FDFBF7', escura: '#F3ECE0' },
        tinta:    { DEFAULT: '#16281F', suave: '#4A5A50' },
        alerta:   { DEFAULT: '#D64545' },
      },
      fontFamily: {
        // display com personalidade; body redondo e altamente legível
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // base 18px — público 45+ e tela pequena com reflexo. Nada abaixo de 16.
        base: ['1.125rem', { lineHeight: '1.6' }],
        lg: ['1.375rem', { lineHeight: '1.5' }],
        xl: ['1.75rem', { lineHeight: '1.35' }],
        '2xl': ['2.25rem', { lineHeight: '1.2' }],
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.75rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(22, 40, 31, 0.08)',
        acao: '0 6px 18px rgba(242, 118, 12, 0.30)',
      },
      minHeight: {
        toque: '56px', // alvo de toque generoso em toda ação principal
      },
    },
  },
  plugins: [],
}
