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
  // Das Zeitwort heißt Nachmittag. „Tag“ überlappt nur im Gruß („buenas tardes“) und gilt
  // deshalb als teilweise verstanden; die genaue Form bleibt beim Üben offen.
  'tarde:tarde':{de:[rule('am Nachmittag','context','Nachmittag'),rule('nachmittags','context','Nachmittag'),rule('Tag','concept','Nachmittag','partial'),rule('Tage','concept','Nachmittag','partial')]},
  'tardes:tardes':{de:[rule('am Nachmittag','context','Nachmittage'),rule('nachmittags','context','Nachmittage'),rule('Tag','concept','Nachmittage','partial'),rule('Tage','concept','Nachmittage','partial')]},
  // Notiert sind „Entschuldigung“ und „entschuldigen Sie“. „Verzeihung“ ist dasselbe
  // höfliche Wort mit anderer Wendung, also übernommen; die notierte Form bleibt Referenz.
  'disculpe:disculpe':{de:[rule('Verzeihung','context','Entschuldigung'),rule('Verzeihen Sie','context','entschuldigen Sie')]},
  'puta:puta':{
    de:[rule('Schlampe','register','Hure'),rule('Prostituierte','register','Hure')],
    es:[rule('zorra','register','puta')],
    'pt-BR':[rule('vagabunda','register','puta')]
  }
};
