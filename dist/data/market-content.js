import {wordEntry,sentence,reply} from '../model/content.js';
// Probestunde.pdf, S. 4–7: Einkaufsablauf; eigene Erweiterungen für Mengen und Gastronomie.
// Ein gemeinsamer Katalog hält neue Inhalte in de/es/pt-BR synchron.
const forms=value=>[...new Set(value.split('|').flatMap(text=>[text,...(/\d+ (?:mililitros|Milliliter|gramos|Gramm|gramas)/u.test(text)?[text.replace(/(\d+) (?:mililitros|Milliliter)/gu,'$1 ml').replace(/(\d+) (?:gramos|Gramm|gramas)/gu,'$1 g')]:[])]))];
export const marketTopics=[
  {id:'supermarkt',group:'Essen & Einkaufen',name:'Im Supermarkt',subtitle:'Wagen, Waren finden und an der Kasse antworten.',symbol:'▦',color:'sage'},
  {id:'theke',group:'Essen & Einkaufen',name:'An der Frischetheke',subtitle:'Gramm, Kilo und die gewünschte Menge.',symbol:'◴',color:'peach'},
  {id:'bar',group:'Essen & Einkaufen',name:'An der Bar',subtitle:'Getränke bestellen, Mengen klären und bezahlen.',symbol:'◡',color:'lavender'}
];
export const marketTopicLocales={
  supermarkt:['En el supermercado','Carrito, productos y respuestas en la caja.','No supermercado','Carrinho, produtos e respostas no caixa.'],
  theke:['En el mostrador','Gramos, kilos y la cantidad que necesitas.','No balcão de frios','Gramas, quilos e a quantidade que você quer.'],
  bar:['En el bar','Pedir bebidas, aclarar cantidades y pagar.','No bar','Pedir bebidas, esclarecer quantidades e pagar.']
};
// id, spanische Formen, deutsche Formen, brasilianische Formen, Themen
const words=[
  ['supermercado','supermercado','Supermarkt','supermercado',['supermarkt','einkaufen','wege']],
  ['carro-supermercado','carro de supermercado|carrito de supermercado|carrito de la compra|el carro de supermercado|el carrito de supermercado','Einkaufswagen','carrinho de supermercado|carrinho de compras',['supermarkt','einkaufen']],
  ['canasto-compras','canasto de compras|canasta de compras|cesta de la compra|el canasto de compras','Einkaufskorb|Korb','cesta de compras|cestinha de compras',['supermarkt','einkaufen']],
  ['canasto-ruedas','canasto con ruedas|cesta con ruedas','Rollkorb|Einkaufskorb mit Rollen','cesta com rodinhas',['supermarkt','einkaufen']],
  ['pasillo','pasillo','Gang|Korridor','corredor',['supermarkt','wege','unterkunft']],
  ['mostrador','mostrador','Theke|Ladentheke|Tresen','balcão',['supermarkt','theke','bar','einkaufen']],
  ['caja-supermercado','caja','Kasse','caixa',['supermarkt','einkaufen','bezahlen']],
  ['bolsa','bolsa|bolsita','Tüte|Tasche|Einkaufstüte','sacola|sacolinha',['supermarkt','einkaufen']],
  ['frutas','frutas','Obst|Früchte','frutas',['supermarkt','lebensmittel']],
  ['jamon','jamón','Schinken','presunto',['supermarkt','theke','lebensmittel','restaurant']],
  ['carne-vacuno','carne de vacuno|carne de res|carne vacuna','Rindfleisch','carne bovina|carne de boi',['supermarkt','theke','lebensmittel','restaurant']],
  ['gramo','gramo|gramos','Gramm','grama',['theke','supermarkt','zahlen','lebensmittel']],
  ['litro','litro|litros','Liter','litro',['supermarkt','bar','zahlen','lebensmittel']],
  ['mililitro','mililitro|mililitros','Milliliter','mililitro',['bar','zahlen','lebensmittel']],
  ['medio-litro','medio litro','ein halber Liter|halber Liter|500 Milliliter|0,5 Liter','meio litro|quinhentos mililitros|500 mililitros',['bar','zahlen','supermarkt','lebensmittel']],
  ['cuarto-litro','un cuarto de litro|1/4 de litro','ein Viertelliter|Viertelliter|ein viertel Liter|250 Milliliter','um quarto de litro|duzentos e cinquenta mililitros|250 mililitros',['bar','zahlen','lebensmittel']],
  ['octavo-litro','un octavo de litro|1/8 de litro','ein Achtelliter|Achtelliter|ein achtel Liter|125 Milliliter','um oitavo de litro|cento e vinte e cinco mililitros|125 mililitros',['bar','zahlen']],
  ['cerveza','cerveza','Bier','cerveja',['bar','restaurant','supermarkt','lebensmittel']],
  ['vino','vino','Wein','vinho',['bar','restaurant','supermarkt','lebensmittel']],
  ['vino-tinto','vino tinto','Rotwein','vinho tinto',['bar','restaurant','supermarkt']],
  ['vino-blanco','vino blanco','Weißwein','vinho branco',['bar','restaurant','supermarkt']],
  ['botella','botella','Flasche','garrafa',['bar','cafe','restaurant','supermarkt','lebensmittel']],
  ['jarra','jarra','Krug|Karaffe','jarra',['bar','restaurant']],
  ['copa','copa','Weinglas|Stielglas','taça',['bar','restaurant']],
  ['sin-gas','sin gas','ohne Kohlensäure|still','sem gás',['bar','cafe','restaurant','supermarkt']],
  ['con-gas','con gas','mit Kohlensäure|sprudelnd','com gás',['bar','cafe','restaurant','supermarkt']],
  ['tarjeta-credito','tarjeta de crédito','Kreditkarte','cartão de crédito',['supermarkt','bar','bezahlen','einkaufen','unterkunft']],
  ['turista','turista','Tourist|Touristin','turista',['supermarkt','vorstellen','unterkunft']],
  ['recibo','recibo|ticket de compra','Kassenbon|Quittung','recibo|comprovante de compra',['supermarkt','einkaufen','bezahlen']],
  ['me-da','me da','geben Sie mir|ich hätte gern','me dá|pode me dar',['supermarkt','theke','bar','cafe']],
  ['quiero','quiero','ich möchte|ich will','quero',['supermarkt','theke','bar','cafe','restaurant']],
  ['nada-mas','nada más','sonst nichts|nichts weiter','nada mais',['supermarkt','theke','bar','cafe','restaurant']],
  ['doscientos','doscientos','zweihundert','duzentos',['theke','zahlen']],
  ['quinientos','quinientos','fünfhundert','quinhentos',['theke','bar','zahlen']]
];
export const marketVocabulary=words.map(([id,es,de,pt,topics])=>wordEntry(id,forms(es)[0],forms(de),topics,'',{aliases:forms(es)}));
export const marketPtVocabulary=Object.fromEntries(words.map(([id,es,de,pt])=>[id,forms(pt).join('|')]));
// id, Themen, de, es, pt-BR. Striche trennen ausdrücklich gepflegte Antwortvarianten.
const phrases=[
  ['market-cart',['supermarkt','einkaufen'],'Wo sind die Einkaufswagen?','¿Dónde están los carros de supermercado?|¿Dónde están los carritos?','Onde ficam os carrinhos de supermercado?|Onde estão os carrinhos?'],
  ['market-basket',['supermarkt','einkaufen'],'Ich brauche einen Einkaufskorb.','Necesito un canasto de compras.|Necesito una cesta de la compra.','Preciso de uma cesta de compras.'],
  ['market-rice',['supermarkt','lebensmittel','einkaufen'],'Wo ist der Reis?','¿Dónde está el arroz?','Onde fica o arroz?|Onde está o arroz?'],
  ['market-water',['supermarkt','lebensmittel','einkaufen'],'Wo ist das Wasser?','¿Dónde está el agua?','Onde fica a água?|Onde está a água?'],
  ['market-fruit',['supermarkt','lebensmittel','einkaufen'],'Wo ist das Obst?','¿Dónde están las frutas?|¿Dónde está la fruta?','Onde ficam as frutas?|Onde estão as frutas?'],
  ['market-toilet',['supermarkt','bar','restaurant','hilfe','unterkunft'],'Wo ist die Toilette?','¿Dónde está el baño?','Onde fica o banheiro?'],
  ['counter-ham',['supermarkt','theke','lebensmittel','einkaufen','zahlen'],'Ich hätte gern hundert Gramm Schinken, bitte.|Ich hätte gern 100 Gramm Schinken, bitte.','Me da cien gramos de jamón, por favor.|Quiero cien gramos de jamón, por favor.|Cien gramos de jamón, por favor.|100 gramos de jamón, por favor.','Quero cem gramas de presunto, por favor.|Cem gramas de presunto, por favor.|100 gramas de presunto, por favor.'],
  ['counter-beef',['supermarkt','theke','lebensmittel','einkaufen','zahlen'],'Ein Kilo Rindfleisch, bitte.|Ein Kilogramm Rindfleisch, bitte.','Un kilo de carne de vacuno, por favor.|Un kilo de carne de res, por favor.|Quiero un kilo de carne de vacuno, por favor.','Um quilo de carne bovina, por favor.|Um quilo de carne de boi, por favor.'],
  ['counter-quarter',['supermarkt','theke','lebensmittel','zahlen'],'Ein Viertelkilo Käse, bitte.|250 Gramm Käse, bitte.','Un cuarto de kilo de queso, por favor.|Doscientos cincuenta gramos de queso, por favor.|250 gramos de queso, por favor.','Um quarto de quilo de queijo, por favor.|Duzentos e cinquenta gramas de queijo, por favor.|250 gramas de queijo, por favor.'],
  ['counter-twohundred',['supermarkt','theke','lebensmittel','zahlen'],'Zweihundert Gramm Schinken, bitte.|200 Gramm Schinken, bitte.','Doscientos gramos de jamón, por favor.|200 gramos de jamón, por favor.','Duzentos gramas de presunto, por favor.|200 gramas de presunto, por favor.'],
  ['market-two-bags',['supermarkt','einkaufen','zahlen'],'Ja, zwei Tüten, bitte.','Sí, dos bolsas, por favor.|Sí, dos bolsitas, por favor.','Sim, duas sacolas, por favor.'],
  ['market-no-bag',['supermarkt','einkaufen'],'Keine Tüte, danke.','Sin bolsa, gracias.|No quiero bolsa, gracias.','Sem sacola, por favor.|Não quero sacola, obrigado.|Não quero sacola, obrigada.'],
  ['market-credit',['supermarkt','einkaufen','bezahlen','bar'],'Ich bezahle mit Kreditkarte.','Pago con tarjeta de crédito.|Con tarjeta de crédito.','Pago com cartão de crédito.|Vou pagar com cartão de crédito.'],
  ['market-total',['supermarkt','einkaufen','bezahlen','bar'],'Was macht das insgesamt?','¿Cuánto es en total?|¿Cuánto es todo?','Quanto fica no total?|Quanto é no total?'],
  ['market-receipt',['supermarkt','einkaufen','bezahlen'],'Den Kassenbon, bitte.','El recibo, por favor.|El ticket de compra, por favor.','O recibo, por favor.|O comprovante de compra, por favor.'],
  ['market-tourist',['supermarkt','vorstellen','unterkunft'],'Ich bin Tourist.|Ich bin Touristin.','Soy turista.','Sou turista.'],
  ['bar-half-beer',['bar','restaurant','zahlen'],'Einen halben Liter Bier, bitte.|0,5 Liter Bier, bitte.|500 Milliliter Bier, bitte.','Medio litro de cerveza, por favor.|Quisiera medio litro de cerveza, por favor.|500 mililitros de cerveza, por favor.','Meio litro de cerveja, por favor.|Quero meio litro de cerveja, por favor.|500 mililitros de cerveja, por favor.'],
  ['bar-litre-beer',['bar','restaurant','zahlen'],'Einen Liter Bier, bitte.|1 Liter Bier, bitte.','Un litro de cerveza, por favor.|Quisiera un litro de cerveza, por favor.|1 litro de cerveza, por favor.','Um litro de cerveja, por favor.|Quero um litro de cerveja, por favor.|1 litro de cerveja, por favor.'],
  ['bar-eighth-wine',['bar','restaurant','zahlen'],'Einen Achtelliter Wein, bitte.|Ein Achtel Liter Wein, bitte.|125 Milliliter Wein, bitte.','Un octavo de litro de vino, por favor.|Ciento veinticinco mililitros de vino, por favor.|125 mililitros de vino, por favor.','Um oitavo de litro de vinho, por favor.|Cento e vinte e cinco mililitros de vinho, por favor.|125 mililitros de vinho, por favor.'],
  ['bar-quarter-wine',['bar','restaurant','zahlen'],'Einen Viertelliter Rotwein, bitte.|250 Milliliter Rotwein, bitte.','Un cuarto de litro de vino tinto, por favor.|Doscientos cincuenta mililitros de vino tinto, por favor.|250 mililitros de vino tinto, por favor.','Um quarto de litro de vinho tinto, por favor.|Duzentos e cinquenta mililitros de vinho tinto, por favor.|250 mililitros de vinho tinto, por favor.'],
  ['bar-bottle-water',['bar','cafe','restaurant','supermarkt'],'Eine Flasche stilles Wasser, bitte.','Una botella de agua sin gas, por favor.','Uma garrafa de água sem gás, por favor.'],
  ['bar-sparkling',['bar','cafe','restaurant','supermarkt'],'Mit Kohlensäure, bitte.','Con gas, por favor.','Com gás, por favor.'],
  ['bar-white-wine',['bar','restaurant'],'Ein Glas Weißwein, bitte.','Una copa de vino blanco, por favor.','Uma taça de vinho branco, por favor.'],
  ['bar-water-half',['bar','cafe','restaurant','zahlen'],'Einen halben Liter Wasser, bitte.|500 Milliliter Wasser, bitte.','Medio litro de agua, por favor.|500 mililitros de agua, por favor.','Meio litro de água, por favor.|500 mililitros de água, por favor.']
];
export const marketSentences=phrases.map(([id,topics,de,es,pt])=>({...sentence(id,topics,forms(de)[0],forms(es)),answerForms:{de:forms(de)}}));
export const marketPtSentences=Object.fromEntries(phrases.map(([id,topics,de,es,pt])=>[id,forms(pt).join('|')]));

// id, Themen, Gegenüber [de/es/pt], Aufgabe [de/es/pt], Antworten [de/es/pt].
const dialogues=[
  ['market-cart-help',['supermarkt','einkaufen'],['Kann ich Ihnen helfen?','¿Le puedo ayudar?','Posso ajudar?'],['Frage nach den Einkaufswagen.','Pregunta dónde están los carritos.','Pergunte onde ficam os carrinhos.'],['Wo sind die Einkaufswagen?','¿Dónde están los carros de supermercado?|¿Dónde están los carritos?','Onde ficam os carrinhos de supermercado?|Onde estão os carrinhos?']],
  ['market-rice-help',['supermarkt','lebensmittel','einkaufen','hilfe'],['Was suchen Sie?','¿Qué busca?','O que você está procurando?'],['Frage, wo der Reis steht.','Pregunta dónde está el arroz.','Pergunte onde fica o arroz.'],['Wo ist der Reis?','¿Dónde está el arroz?|¿Dónde puedo encontrar el arroz?','Onde fica o arroz?|Onde posso encontrar o arroz?']],
  ['market-water-help',['supermarkt','lebensmittel','einkaufen'],['Was brauchen Sie?','¿Qué necesita?','Do que você precisa?'],['Frage, wo das Wasser steht.','Pregunta dónde está el agua.','Pergunte onde fica a água.'],['Wo ist das Wasser?','¿Dónde está el agua?','Onde fica a água?|Onde está a água?']],
  ['market-fruit-help',['supermarkt','lebensmittel','einkaufen'],['Suchen Sie etwas?','¿Busca algo?','Está procurando alguma coisa?'],['Frage nach dem Obst.','Pregunta dónde están las frutas.','Pergunte onde ficam as frutas.'],['Wo ist das Obst?','¿Dónde están las frutas?|¿Dónde está la fruta?','Onde ficam as frutas?|Onde estão as frutas?']],
  ['counter-ham-amount',['supermarkt','theke','lebensmittel','zahlen'],['Wie viel Schinken möchten Sie?','¿Cuánto jamón quiere?','Quanto presunto você quer?'],['Bestelle hundert Gramm Schinken.','Pide cien gramos de jamón.','Peça cem gramas de presunto.'],['Hundert Gramm Schinken, bitte.|100 Gramm Schinken, bitte.','Cien gramos de jamón, por favor.|100 gramos de jamón, por favor.|Me da cien gramos de jamón, por favor.','Cem gramas de presunto, por favor.|100 gramas de presunto, por favor.|Quero cem gramas de presunto, por favor.']],
  ['counter-beef-amount',['supermarkt','theke','lebensmittel','zahlen'],['Was darf es sein?','¿Qué le pongo?','O que vai querer?'],['Bestelle ein Kilo Rindfleisch.','Pide un kilo de carne de vacuno.','Peça um quilo de carne bovina.'],['Ein Kilo Rindfleisch, bitte.|Ein Kilogramm Rindfleisch, bitte.','Un kilo de carne de vacuno, por favor.|Un kilo de carne de res, por favor.','Um quilo de carne bovina, por favor.|Um quilo de carne de boi, por favor.']],
  ['counter-quarter-amount',['supermarkt','theke','lebensmittel','zahlen'],['Wie viel Käse?','¿Cuánto queso?','Quanto queijo?'],['Bitte um 250 Gramm Käse, also ein Viertelkilo.','Pide doscientos cincuenta gramos de queso: un cuarto de kilo.','Peça duzentos e cinquenta gramas de queijo: um quarto de quilo.'],['250 Gramm Käse, bitte.|Ein Viertelkilo Käse, bitte.','Doscientos cincuenta gramos de queso, por favor.|250 gramos de queso, por favor.|Un cuarto de kilo de queso, por favor.','Duzentos e cinquenta gramas de queijo, por favor.|250 gramas de queijo, por favor.|Um quarto de quilo de queijo, por favor.']],
  ['counter-enough',['supermarkt','theke','lebensmittel'],['Darf es noch etwas sein?','¿Algo más?','Mais alguma coisa?'],['Sag, dass das alles ist, und bedanke dich.','Di que eso es todo y da las gracias.','Diga que é só isso e agradeça.'],['Sonst nichts, danke.|Das ist alles, danke.','Nada más, gracias.|Eso es todo, gracias.','Só isso, obrigado.|Só isso, obrigada.|Nada mais, obrigado.|Nada mais, obrigada.']],
  ['market-bags-yes',['supermarkt','einkaufen','zahlen'],['Möchten Sie eine Tüte?','¿Quiere bolsita?','Quer uma sacolinha?'],['Bitte um zwei Tüten.','Pide dos bolsas.','Peça duas sacolas.'],['Ja, zwei, bitte.|Zwei Tüten, bitte.','Sí, dos, por favor.|Dos bolsas, por favor.|Sí, dos bolsas, por favor.','Sim, duas, por favor.|Duas sacolas, por favor.|Sim, duas sacolas, por favor.']],
  ['market-bags-no',['supermarkt','einkaufen'],['Brauchen Sie eine Tüte?','¿Necesita una bolsa?','Precisa de uma sacola?'],['Lehne die Tüte höflich ab.','Rechaza la bolsa con educación.','Recuse a sacola com educação.'],['Nein, danke.|Keine Tüte, danke.','No, gracias.|Sin bolsa, gracias.','Não, obrigado.|Não, obrigada.|Sem sacola, por favor.']],
  ['market-ruc-tourist',['supermarkt','bezahlen'],['Wie lautet Ihre RUC-Steuernummer?','¿Cuál es su RUC?','Qual é o seu RUC?'],['In dieser Paraguay-Situation hast du keinen RUC. Sage das und erkläre, dass du als Tourist oder Touristin hier bist.','En esta situación en Paraguay no tienes RUC. Dilo y explica que eres turista.','Nesta situação no Paraguai você não tem RUC. Diga isso e explique que é turista.'],['Ich habe keine. Ich bin Tourist.|Ich habe keine. Ich bin Touristin.|Ich habe keine RUC-Steuernummer. Ich bin Tourist.','No tengo. Soy turista.|No tengo RUC. Soy turista.','Não tenho. Sou turista.|Não tenho RUC. Sou turista.']],
  ['market-credit-answer',['supermarkt','bezahlen','einkaufen','bar'],['Wie bezahlen Sie?','¿Cómo paga?','Como vai pagar?'],['Sage ausdrücklich, dass du mit Kreditkarte bezahlst.','Di que pagas con tarjeta de crédito.','Diga que vai pagar com cartão de crédito.'],['Mit Kreditkarte.|Ich bezahle mit Kreditkarte.','Con tarjeta de crédito.|Pago con tarjeta de crédito.|Crédito.','Com cartão de crédito.|Pago com cartão de crédito.|No crédito.']],
  ['market-cash-total',['supermarkt','bezahlen','einkaufen'],['Wie möchten Sie bezahlen?','¿Cómo quiere pagar?','Como quer pagar?'],['Sag, dass du bar bezahlst, und frage nach dem Gesamtbetrag.','Di que pagas en efectivo y pregunta cuánto es en total.','Diga que vai pagar em dinheiro e pergunte o total.'],['Ich bezahle bar. Was macht das insgesamt?|Bar. Wie viel macht das?','Pago en efectivo. ¿Cuánto es?|En efectivo. ¿Cuánto es en total?|Pago con efectivo. ¿Cuánto es?','Vou pagar em dinheiro. Quanto fica no total?|Em dinheiro. Quanto é?']],
  ['market-receipt-answer',['supermarkt','bezahlen','einkaufen'],['Brauchen Sie den Kassenbon?','¿Quiere el recibo?','Quer o comprovante de compra?'],['Bitte höflich um den Kassenbon.','Pide el recibo con educación.','Peça o comprovante com educação.'],['Ja, bitte.|Den Kassenbon, bitte.','Sí, por favor.|El recibo, por favor.|El ticket de compra, por favor.','Sim, por favor.|O recibo, por favor.|O comprovante, por favor.']],
  ['market-bye',['supermarkt','einkaufen','begruessen'],['Danke für Ihren Einkauf.','Gracias por su compra.','Obrigado pela compra.'],['Bedanke dich und verabschiede dich.','Da las gracias y despídete.','Agradeça e se despeça.'],['Danke, tschüss.|Danke, auf Wiedersehen.','Gracias, chao.|Gracias, hasta luego.','Obrigado, tchau.|Obrigada, tchau.']],
  ['bar-half-answer',['bar','restaurant','zahlen'],['Ein halber Liter oder ein Liter?','¿Medio litro o un litro?','Meio litro ou um litro?'],['Wähle einen halben Liter Bier.','Elige medio litro de cerveza.','Escolha meio litro de cerveja.'],['Einen halben Liter Bier, bitte.|500 Milliliter Bier, bitte.|0,5 Liter Bier, bitte.','Medio litro de cerveza, por favor.|500 mililitros de cerveza, por favor.','Meio litro de cerveja, por favor.|500 mililitros de cerveja, por favor.']],
  ['bar-litre-answer',['bar','restaurant','zahlen'],['Wie viel Bier möchten Sie?','¿Cuánta cerveza quiere?','Quanta cerveja você quer?'],['Bestelle einen Liter Bier.','Pide un litro de cerveza.','Peça um litro de cerveja.'],['Einen Liter Bier, bitte.|1 Liter Bier, bitte.','Un litro de cerveza, por favor.|1 litro de cerveza, por favor.','Um litro de cerveja, por favor.|1 litro de cerveja, por favor.']],
  ['bar-eighth-answer',['bar','restaurant','zahlen'],['Wie viel Wein möchten Sie?','¿Cuánto vino quiere?','Quanto vinho você quer?'],['Bestelle ausdrücklich 125 Milliliter Wein, also einen Achtelliter.','Pide ciento veinticinco mililitros de vino: un octavo de litro.','Peça cento e vinte e cinco mililitros de vinho: um oitavo de litro.'],['125 Milliliter Wein, bitte.|Einen Achtelliter Wein, bitte.|Ein Achtel Liter Wein, bitte.','Ciento veinticinco mililitros de vino, por favor.|125 mililitros de vino, por favor.|Un octavo de litro de vino, por favor.','Cento e vinte e cinco mililitros de vinho, por favor.|125 mililitros de vinho, por favor.|Um oitavo de litro de vinho, por favor.']],
  ['bar-quarter-answer',['bar','restaurant','zahlen'],['Rotwein oder Weißwein?','¿Vino tinto o blanco?','Vinho tinto ou branco?'],['Bestelle einen Viertelliter Rotwein, also 250 Milliliter.','Pide un cuarto de litro de vino tinto: doscientos cincuenta mililitros.','Peça um quarto de litro de vinho tinto: duzentos e cinquenta mililitros.'],['Einen Viertelliter Rotwein, bitte.|250 Milliliter Rotwein, bitte.','Un cuarto de litro de vino tinto, por favor.|Doscientos cincuenta mililitros de vino tinto, por favor.|250 mililitros de vino tinto, por favor.','Um quarto de litro de vinho tinto, por favor.|Duzentos e cinquenta mililitros de vinho tinto, por favor.|250 mililitros de vinho tinto, por favor.']],
  ['bar-water-answer',['bar','cafe','restaurant'],['Mit oder ohne Kohlensäure?','¿Con gas o sin gas?','Com gás ou sem gás?'],['Bitte um stilles Wasser.','Pide agua sin gas.','Peça água sem gás.'],['Ohne Kohlensäure, bitte.|Stilles Wasser, bitte.','Sin gas, por favor.|Agua sin gas, por favor.','Sem gás, por favor.|Água sem gás, por favor.']]
];
export const marketReplies=dialogues.map(([id,topics,heard,task,answers])=>({...reply(id,topics,heard[1],heard[0],task[0],forms(answers[1]),forms(answers[0])[0]),answerForms:{de:forms(answers[0])}}));
export const marketReplyLocales=Object.fromEntries(dialogues.map(([id,topics,heard,task,answers])=>[id,[heard[2],task[2],task[1],forms(answers[2]).join('|')]]));

// Bestehende Karten bleiben unter derselben ID; nur sinnvolle Themenzuordnungen kommen hinzu.
const shared={
  word:{
    supermarkt:['agua','pan','leche','manzana','arroz','queso','carne','pollo','verduras','patatas','tomate','platano','naranja','huevos','sal','aceite','azucar','precio','cuanto','cuesta','tarjeta','efectivo','pagar','kilo','medio','bano','salida','por-favor','gracias','hola','adios'],
    theke:['queso','carne','pollo','pescado','kilo','medio','cien','dos','por-favor','gracias','mas','menos'],
    bar:['agua','cafe','zumo','te','vaso','cuenta','frio','mesa','pagar','tarjeta','efectivo','medio','por-favor','gracias','bano']
  },
  sentence:{supermarkt:['kilo-tomatoes','half-kilo','need-milk','have-apples','how-much','pay-card','pay-cash','pay-please','slower'],theke:['half-kilo','kilo-tomatoes','how-much','one-more','repeat'],bar:['bill','glass-water','pay-card','pay-cash','pay-please','repeat']},
  reply:{supermarkt:['cheese-quantity','payment','cash-only','anything-else','thanks-back'],theke:['cheese-quantity','anything-else','thanks-back','dont-understand'],bar:['payment','cash-only','anything-else','drink-order','thanks-back']}
};
const pdfAliases={arroz:['el arroz'],agua:['el agua'],queso:['el queso']};
export function addMarketTopics(kind,entries){return entries.map(entry=>({...entry,...(kind==='word'&&pdfAliases[entry.id]?{aliases:[...new Set([...(entry.aliases??[]),...pdfAliases[entry.id]])]}:{}),topics:[...new Set([...entry.topics,...Object.entries(shared[kind]).filter(([,ids])=>ids.includes(entry.id)).map(([topic])=>topic)])]}));}
