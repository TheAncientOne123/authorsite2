// cronicas_sidebars.js

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  CrSaSoSidebar: [
    { type: 'doc', id: 'index', label: 'Crónicas de Sangre y Sombra' },

    // Portadas (una por grupo), SIN categorías:
    { type: 'doc', id: 'eventos-portada', label: 'Eventos' },
    { type: 'doc', id: 'familia-portada', label: 'Familias y Organizaciones' },
    { type: 'doc', id: 'lugares-portada', label: 'Lugares' },
    { type: 'doc', id: 'personajes-portada', label: 'Personajes' },
    { type: 'doc', id: 'otros-portada', label: 'Otros' },
  ],
  
};

module.exports = sidebars;