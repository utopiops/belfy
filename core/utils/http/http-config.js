class HttpConfig {

    constructor() {
        this.headers = {};
        this.config = {
            headers: this.headers
        };
    }

    withBasicAuthToken(token) {
        this.headers = {
            ...this.headers,
            Authorization: `Basic ${token}`
        }

        this.config['headers'] = this.headers;
        return this;
    }
    
    withBearerAuthToken(token) {
        this.headers = {
            ...this.headers,
            Authorization: `Bearer ${token}`
        }

        this.config['headers'] = this.headers;
        return this;
    }
    withJsonContentType() {
        this.headers = {
            ...this.headers,
            'Content-Type': 'application/json'
        }
        this.config['headers'] = this.headers;
        return this;
    }

    withUrlEncContentType() {
        this.headers = {
            ...this.headers,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        this.config['headers'] = this.headers;
        return this;
    }

    withCustomHeader(key, value) {
        this.config.headers[key] = value;
        return this;
    }

    withCustomHeaders(headers) {
        this.headers = {
            ...this.headers,
            ...headers
        }

        this.config['headers'] = this.headers;
        return this;
    }
}

module.exports = HttpConfig;