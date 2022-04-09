const axios = require('axios');


class HttpHelper {
  static tokens = {};

  options =  {
    headers: {}
  };
  
  withHeaders = headers => {
    headers.map(h => this.options.headers[h.name] = h.value);
    return this;
  }

  withAuth = token => {
    return this.withHeaders([{
      name: 'Authorization',
      value: `Bearer ${token}`
    }]);
  }

  get = (url) => {
    return axios.get(url, this.options);
  }

  post = (url, data) => {
      return axios.post(url, data, this.options);
  }

  put = (url, data) => {
      return axios.put(url, data, this.options);
  }

  patch = (url, data) => {
      return axios.patch(url, data, this.options);
  }

  delete = (url) => {
      return axios.delete(url, this.options);
  }
}

module.exports = HttpHelper;
