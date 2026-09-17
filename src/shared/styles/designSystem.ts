/**
 * designSystem.ts
 * 
 * Classes constantes centralizadas para estilização e tipografia da interface, garantindo 
 * linguagem visual consistente, modularidade e código limpo em toda a aplicação.
 * Mapeadas para configurações utilitárias padrão do Tailwind.
 */

export const THEME = {
  // Classes de contêiner visual comuns
  card: {
    container: "bg-white border border-gray-200 rounded-xl p-4 md:p-5 transition-all shadow-3xs",
    interactive: "bg-white border border-gray-200 rounded-xl p-4 md:p-5 transition-all hover:bg-gray-50/40 hover:border-gray-300 shadow-3xs",
    header: "border-b border-gray-100 pb-4 mb-4",
    title: "text-gray-800 font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-1.5 leading-none",
    overlay: "fixed inset-0 z-50 overflow-y-auto px-4 py-12 bg-black/40 backdrop-blur-xs flex items-center justify-center",
    modal: "bg-white border border-gray-250 rounded-2xl p-6 w-full max-w-md shadow-2xl relative select-none animate-fade-in text-left",
  },

  // Botões interativos da interface
  button: {
    primary: "bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[9px] tracking-wider py-2.5 px-5 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1 shadow-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase text-[9px] tracking-wider py-2.5 px-4 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    outline: "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 font-bold uppercase text-[9px] tracking-wider py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-colors max-md:flex-1 justify-center shadow-3xs",
    danger: "bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 font-bold uppercase text-[9px] tracking-wider py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-colors max-md:flex-1 justify-center shadow-3xs",
    link: "text-xs text-gray-500 hover:text-gray-800 font-bold uppercase transition-colors cursor-pointer",
    tabActive: "px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-bold bg-blue-600 text-white shadow-3xs",
    tabInactive: "px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-bold text-gray-600 hover:text-gray-900",
  },

  // Campos de entrada de formulário interativos
  input: {
    text: "w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-semibold",
    textSmall: "w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-semibold",
    textarea: "w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-medium",
    textareaSmall: "w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-medium",
    select: "w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-bold cursor-pointer",
    selectSmall: "w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-bold cursor-pointer",
    label: "text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1",
    labelSmall: "text-[9px] text-gray-500 uppercase tracking-wider block font-semibold mb-1 truncate",
  },

  // Emblemas de status (Badges)
  badge: {
    success: "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200",
    warning: "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-250",
    neutral: "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-550 border border-gray-200",
    danger: "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-250",
    category: "text-[10px] text-blue-600 font-bold uppercase",
  },

  // Estilização do componente Header
  header: {
    navbar: "sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-3.5 py-2.5 sm:px-6 md:px-8 flex items-center justify-between gap-4 select-none shadow-xs transition-colors",
    logoWrapper: "flex items-center gap-1 cursor-pointer group shrink-0",
    profileMobileBadge: "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity border",
    searchWrapper: "hidden",
    searchIcon: "hidden",
    searchInput: "hidden",
    searchClear: "hidden",
    actionsWrapper: "flex items-center gap-2 sm:gap-3 w-auto justify-end",
    simButton: "text-xs text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1.5 font-medium px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer max-md:w-full max-md:justify-center",
    simDropdown: "absolute top-10 right-0 bg-white border border-gray-200 rounded-xl p-2.5 shadow-xl flex flex-col gap-1.5 z-50 text-xs w-48 animate-in slide-in-from-top-2 duration-155",
    simItem: "flex items-center gap-2 w-full text-left p-1.5 rounded-md hover:bg-blue-50 text-gray-700 hover:text-blue-600 cursor-pointer transition-colors",
    realUserWrapper: "flex items-center gap-2 sm:gap-3",
    realUserBtn: "flex items-center gap-2 sm:gap-2.5 text-right cursor-pointer group hover:opacity-90 transition-opacity",
    realUserMeta: "hidden sm:flex flex-col text-right",
    realUserAvatar: "w-8 h-8 rounded-full p-[1.5px] transition-transform group-hover:scale-105",
    realUserInitials: "w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold border",
    logoutBtn: "text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2 cursor-pointer rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40",
    loginBtn: "flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-all font-semibold uppercase text-xs tracking-wider px-4 py-2 sm:px-5 sm:py-2 rounded-full cursor-pointer shadow-sm hover:scale-102",
  },

  // Estilização do componente Footer
  footer: {
    container: "bg-white border-t border-gray-200 text-gray-500 py-12 px-6 mt-16 md:px-12 selection:bg-blue-600 selection:text-white",
    grid: "max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-center",
    column: "flex flex-col gap-4",
    navigation: "flex flex-col gap-3",
    title: "text-gray-800 font-bold tracking-wide text-xs uppercase",
    list: "text-sm flex flex-col gap-2 text-gray-500",
    link: "hover:text-blue-600 transition-colors",
    buttonLink: "hover:text-blue-600 transition-colors text-left cursor-pointer",
    contactList: "text-sm flex flex-col gap-3 text-gray-500",
    contactItem: "flex items-center gap-2",
    contactIcon: "w-5 text-blue-650 font-mono",
    textMuted: "text-sm leading-relaxed text-gray-400 mt-2",
    textSmall: "text-xs text-gray-400 mt-1",
  },

  // Estilização do Modal de Perfil
  profileModal: {
    backdrop: "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none",
    card: "bg-white rounded-2xl border border-gray-200 overflow-hidden w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-100 flex flex-col max-h-[85vh] text-left",
    header: "p-5 border-b border-gray-150 flex items-center justify-between",
    avatar: "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
    metaTitle: "text-sm font-bold uppercase tracking-tight text-gray-800",
    metaBadge: "text-[10px] uppercase font-mono tracking-wider font-bold border px-2.5 py-0.5 rounded-full block w-fit mt-0.5",
    body: "p-6 overflow-y-auto flex-1",
    infoCard: "grid grid-cols-2 gap-y-4 gap-x-4 bg-gray-50 p-4 rounded-xl border border-gray-150",
    infoLabel: "text-[10px] text-gray-400 block uppercase tracking-wider font-semibold",
    infoValue: "text-gray-800 truncate block mt-1 font-bold",
  },

  // Layouts e alinhamentos padrão
  layout: {
    container: "max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8",
    flexColGap: "flex flex-col gap-6",
    gridForm: "grid grid-cols-1 md:grid-cols-2 gap-4",
  }
};
