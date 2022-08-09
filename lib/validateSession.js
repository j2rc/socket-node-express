const router = require('express').Router();
const axios = require('axios').default;
const jwt = require("jsonwebtoken");

// Create wrapper function that will adjust router based on provided configuration
const validateSession = async function ( req ) {
  const { headers } = req;
  
  /** Check headers and cookies for authentication */
  if (!headers.cookie) {
    return false
  }

  try {
    const result = await axios({
    url: `http://localhost:3000/api/auth/session`,
    method: "get",
    headers: {
        'Cookie': headers.cookie,
    }
    })
    session = result.data
  } 
  catch (error) {
    return false
  }

  if ( !session || !session?.user.verified ) {
    return false
  }
  
  return session
}

module.exports = {
  validateSession,
};