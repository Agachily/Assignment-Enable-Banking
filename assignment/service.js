const fetch = require('node-fetch');
const {getJWT, config} = require("./utils")

const JWT = getJWT()
const BASE_URL = "https://api.tilisy.com"
const REDIRECT_URL = config.redirectUrl

const baseHeaders = {
    Authorization: `Bearer ${JWT}`
}

const psuHeaders = {
  ...baseHeaders,
  "psu-ip-address": "10.10.10.10",
  "Content-Type" : "application/json",
  "psu-user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:80.0) Gecko/20100101 Firefox/80.0"
}

/**
 * Display the available bank for user to choose 
 * @param {*} banks A list of all available banks
 */
const displayBankList = async (banks) => {
  const result = await fetch(`${BASE_URL}/aspsps`, {
     headers: baseHeaders
  })
  
  const aspsps = (await result.json()).aspsps
  
  for (let i = 0; i < aspsps.length; i++) {
    let bankinfo = {
      name: aspsps[i].name,
      country: aspsps[i].country
    };
    banks.push(bankinfo)
    console.log(`Id : ${i + 1}, Bank Name : ${bankinfo.name}|${bankinfo.country}`)
  }
}

/**
 * Start authorize according to user input
 * @param {*} input The indicator of a chosen bank
 * @param {*} banks A list of all available banks
 * @returns An url for authorization
 */
const authorization = async (input, banks) => {
  let name
  let country
  const validUntil = new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000);
  
  if (!isNaN(input)) {
    id = parseInt(input) - 1
    name = banks[id].name
    country = banks[id].country
  } else {
    let info = input.split('|')
    name = info[0]
    country = info[1]
  }
  
  const startAuthorizationBody = {
    access: {
      valid_until: validUntil.toISOString()
    },
    aspsp: {
      name: name,
      country: country
    },
    state: "some_test_state",
    redirect_url: REDIRECT_URL,
    psu_type: "personal"
  }
  
  console.log(`\nYou are starting authorization to ${startAuthorizationBody.aspsp.name} in ${startAuthorizationBody.aspsp.country}`)
  
  let result = await fetch(`${BASE_URL}/auth`,{
    method: "POST",
    headers: psuHeaders,
    body: JSON.stringify(startAuthorizationBody)
  })
  
  // Get the url for authorization
  let url = (await result.json()).url
  return url
}
  
/**
 * Create user session
 * @param {*} code The code provided after authorization
 * @returns session id
 */
const createUserSession = async (code) => {
  const createSessionBody = {
    code: code
  }
  
  let result = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: psuHeaders,
    body: JSON.stringify(createSessionBody)
  })
  
  result = (await result.json()).session_id
  return result
}

/**
 * Displays a short summary of the transactions for the last 30 days.
 * @param {*} sessionId session id
 */
const displaySummary = async (sessionId) => {
  const result = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    headers: baseHeaders
  })
  
  console.log("\nList of account ids available in the session: ")
  const accountData = (await result.json()).accounts
  accountData.forEach(element => console.log(element))

  /* Get the date to start fetch transactions */
  let date = calculateDate(30)
  console.log(`\nThe transactions is fetched since: ${date}`)

  for (let i = 0; i < accountData.length; i++) {
    await showAccountInfo(accountData[i], date)
  }
}

/**
 * Show the summary of a specific account
 * @param {*} accountId The id of a specific account
 * @param {*} date The date to get transcations
 */
const showAccountInfo = async (accountId, date) => {
  const result = await fetch(`${BASE_URL}/accounts/${accountId}/transactions?date_from=${date}`, {
    headers: psuHeaders
  })
  
  const transacDataInText = await result.text()
  //console.log(transacDataInText)
  const transacData = JSON.parse(transacDataInText).transactions

  if (!transacData) {
    console.log("No transaction data obtained")
    return
  }

  if (transacData.length === 0) {
    console.log(`-----------------------------------------------`)
    console.log(`AccountID: ${accountId}`)
    console.log("No transaction data")
  } else {
    let numberOfTransac = transacData.length
    let transacwithMaxValue = getMaxTransac(transacData)
    let totalValue = calculateTotalValue(transacData)
    
    console.log(`-----------------------------------------------`)
    console.log(`AccountID: ${accountId}`)
    console.log(`The total number of transactions: ${numberOfTransac}`)
    console.log(`The transaction with the maximum value:`)
    console.log(`\tAmount: ${transacwithMaxValue.transaction_amount.amount}`)
    console.log(`\tDate: ${transacwithMaxValue.booking_date}`)
    console.log(`\tStatus: ${transacwithMaxValue.credit_debit_indicator}`)
    console.log(`The total values of all inbound (credit) and outbound (debit) transactions:`)
    console.log(`\tinbound: ${totalValue.creditSum}`)
    console.log(`\toutbound: ${totalValue.debitSum}`)
      
    //console.log(transacData)
    console.log(`The detail of transactions with max value:`)
    console.log(transacwithMaxValue)
  }
}

/**
 * Get the date to fetch transactions from
 * @param {*} days How many days of transactions we want
 * @returns The beginning date
 */
const calculateDate = (days) => {
  let today = new Date()
  let priorDate = JSON.stringify(new Date(new Date().setDate(today.getDate() - days)))
  
  return priorDate.substring(1, 11)
}

/**
 * Get the transication with max value
 * @param {*} transacData The transaction date associated to the account
 * @returns The transcation recording with the max value
 */
const getMaxTransac = (transacData) => {
  let max = transacData[0]
  
  for (i = 1; i < transacData.length; i++) {
    if (parseFloat(max.transaction_amount.amount) < parseFloat(transacData[i].transaction_amount.amount)) {
      max = transacData[i]
    }
  }
  
  return max
}

/**
 * Calculate the total value of inbound and outbound
 * @param {*} transacData The transaction date associated to the account
 * @returns A sum object recording the sum of credit and debit
 */
const calculateTotalValue = (transacData) => {
  let creditSum = 0
  let debitSum = 0
  for (i = 1; i < transacData.length; i++) {
    if (transacData[i].credit_debit_indicator === 'DBIT') {
      debitSum += parseFloat(transacData[i].transaction_amount.amount)
    } else {
      creditSum += parseFloat(transacData[i].transaction_amount.amount)
    }
  }
  
  let sum = {
    creditSum : creditSum.toFixed(2),
    debitSum : debitSum.toFixed(2)
  }
  
  return sum
}

module.exports = {
  displayBankList: displayBankList,
  authorization: authorization,
  createUserSession: createUserSession,
  displaySummary: displaySummary
}