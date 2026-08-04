export default function handler(req, res) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="IWT & ITE Documentation"');
    res.statusCode = 401;
    res.end('Unauthorized');
    return;
  }

  const base64Credentials = authHeader.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  const validUsername = process.env.BASIC_AUTH_USERNAME;
  const validPassword = process.env.BASIC_AUTH_PASSWORD;

  if (username === validUsername && password === validPassword) {
    // Auth successful, continue to next middleware/handler
    return;
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="IWT & ITE Documentation"');
  res.statusCode = 401;
  res.end('Unauthorized');
}
