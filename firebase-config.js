/*
 CONFIGURAÇÃO PÚBLICA DO FIREBASE — substitua pelos dados do seu app Web.
 Estes valores NÃO são senhas. A segurança depende de Authentication + firestore.rules.
 NUNCA coloque uma senha ou chave de conta de serviço neste arquivo.
*/
export const firebaseConfig = {
  apiKey: "AIzaSyDqC7ftPvBBYa-9CHfF0uhvUrY3rm16FPI",
  authDomain: "segtrab-83694.firebaseapp.com",
  projectId: "segtrab-83694",
  appId: "1:781149672717:web:6100c408c481aa4a0f0c44"
};
export const configured = !firebaseConfig.apiKey.startsWith("COLE_AQUI") &&
  firebaseConfig.projectId !== "SEU_PROJETO" &&
  !firebaseConfig.appId.startsWith("COLE_AQUI");
