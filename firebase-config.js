/*
 CONFIGURAÇÃO PÚBLICA DO FIREBASE — substitua pelos dados do seu app Web.
 Estes valores NÃO são senhas. A segurança depende de Authentication + firestore.rules.
 NUNCA coloque uma senha ou chave de conta de serviço neste arquivo.
*/
export const firebaseConfig = {
  apiKey: "COLE_AQUI_A_API_KEY_WEB",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  appId: "COLE_AQUI_O_APP_ID_WEB"
};
export const configured = !firebaseConfig.apiKey.startsWith("COLE_AQUI") &&
  firebaseConfig.projectId !== "SEU_PROJETO" &&
  !firebaseConfig.appId.startsWith("COLE_AQUI");
