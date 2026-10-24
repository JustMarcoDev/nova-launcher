// Lo que comparten los módulos de main/:
//   R: funciones y valores que un módulo ofrece a otros (cada módulo hace Object.assign(R, {...}) al terminar de cargarse)
//   S: variables que cambian con el tiempo y se leen/escriben desde varios módulos (ventana, estado de actualizaciones, descargas…)
module.exports = { R: {}, S: {} };
