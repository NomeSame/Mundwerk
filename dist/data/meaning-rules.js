// Aufnahmehilfen sind keine neuen Wörterbuchbedeutungen oder Flexionsnachweise.
const rule=(answer,reason,canonical,level='accepted')=>({answer,reason,canonical,level});
export const cardinalValues={uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,veinte:20,cien:100,doscientos:200,quinientos:500};
export const meaningGuidance={
  'favor:favor':'meaningHintFavor','por:por':'meaningHintPor','por:por-2':'meaningHintPor','por:por-3':'meaningHintPor',
  'te-quiero:te-quiero':'meaningHintTeQuiero','lavarte:lavarte':'meaningHintLavarte',
  'gusto:gusto':'meaningHintGusto','gusto:gusto-2':'meaningHintGusto'
};
export const meaningRules={
  'tambien:tambien':{
    de:[rule('ich auch','context','auch'),rule('auch ich','context','auch')],
    es:[rule('yo también','context','también')],
    'pt-BR':[rule('eu também','context','também')]
  },
  'puta:puta':{
    de:[rule('Schlampe','register','Hure'),rule('Prostituierte','register','Hure')],
    es:[rule('zorra','register','puta')],
    'pt-BR':[rule('vagabunda','register','puta')]
  }
};
