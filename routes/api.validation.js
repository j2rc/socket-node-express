const router = require('express').Router();
const axios = require('axios').default;
const jwt = require("jsonwebtoken");

// Create wrapper function that will adjust router based on provided configuration
const validateSessionRouter = function () {
  router.all('/:id/*', async (req, res, next) => {
    const {
      params: { id },
      headers,
    } = req;
    
    /** Check headers and cookies for authentication */
    if (!headers.cookie) {
      return res.status(400).json({ message: "Not authorized" });
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
      return res.status(400).json({ message: "Not authorized" });
    }

    if ( !session || !session?.user.verified || session?.user._id !== id ) {
      return res.status(401).json({ msg: "Invalid session" });
    }
    return next()
  })
  
  return router
}

module.exports = {
  validateSessionRouter,
};