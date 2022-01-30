const { input } = require("./utils")
const { displayBankList, authorization, createUserSession, displaySummary } = require("./service")

const main = async () => {
  let banks = []
  let url
  // Dispaly all the avaliable banks
  await displayBankList(banks)

  // User choosen a bank
  const chosenBank = await input('Please choose a bank with its Id (like 5) or its name (like Nordea|DK): \n')
  
  // Displays an authentication link
  try {
    url = await authorization(chosenBank, banks)
  } catch (error) {
    throw new Error ("The bank info you input maybe wrong, please check");
  }
  console.log(`The link for authorzation is ${url} \n`)

  // Complete the authentication and use the code to build session
  const code = await input('Please copy the link to browser, follow the intructions and then copy the authorisation code to the teminal: \n')
  const sessionId = await createUserSession(code)
  if (!sessionId) {
    throw new Error ("The bank code you input maybe wrong, please check");
  }
  console.log(`New session has been created and seesion id is: ${sessionId}`)

  // Dispaly a summary of the data in the user account
  await displaySummary(sessionId)
}


(async () => {
    try{
      await main()
    } catch (error) {
      console.log(`Unexpected error happened: ${error}`)
    }
})();