var Service, Characteristic;
//const { getSessionCookie, getStatus, setStatus } = require('yalealarmsystem');
var fetch = require('node-fetch');

var _HOST = "https://mob.yalehomesystem.co.uk/yapi";
var yaleAuthToken = 'VnVWWDZYVjlXSUNzVHJhcUVpdVNCUHBwZ3ZPakxUeXNsRU1LUHBjdTpkd3RPbE15WEtENUJ5ZW1GWHV0am55eGhrc0U3V0ZFY2p0dFcyOXRaSWNuWHlSWHFsWVBEZ1BSZE1xczF4R3VwVTlxa1o4UE5ubGlQanY5Z2hBZFFtMHpsM0h4V3dlS0ZBcGZzakpMcW1GMm1HR1lXRlpad01MRkw3MGR0bmNndQ==';
var refresh_token = '';
var access_token = '';
var username = '';
var password = '';

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-yalealarmsystem", "YaleAlarm", YaleAlarm);
}

function YaleAlarm(log, config) {
    this.log = log;
    this.name = config["name"];
    this.config = config;
    username = this.config.username;
    password = this.config.password;

    this.service = new Service.LockMechanism(this.name);

    this.service
    .getCharacteristic(Characteristic.LockCurrentState)
    .on('get', this.getState.bind(this));

    this.service
    .getCharacteristic(Characteristic.LockTargetState)
    .on('get', this.getState.bind(this))
    .on('set', this.setState.bind(this));
}

YaleAlarm.prototype.getState = function(callback) {
    this.log("Getting current state...");

    //make a request to get auth token
    authorize()
        .then(response => response.json())//load it as json
        //save the token to global variable
        .then(data => {
            this.log('token received');
            access_token = data.access_token;
            this.log('access_token' + data.access_token);
            refresh_token = data.refresh_token;
            this.log('refresh_token' + data.refresh_token);
            //fetch current url using new token.
            return fetch(_HOST + "/api/panel/mode/",
                {
                    method: 'GET',
                    headers: {
                        "Authorization": "Bearer " + access_token,
                        'Accept': 'application/json, application/xml, text/plain, text/html, *.*',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    }
                }
            );
        })
        .then(response =>
            response.json()
        ) // Load the response as json
        .then(res => {
            this.log('got to getstatefinal');
            this.log('mode:' + res.data[0].mode);
            callback(null, res.data[0].mode === 'arm');         
        }).catch(console.log);    
}

YaleAlarm.prototype.setState = function(state, callback) {
    var alarmState = (state == Characteristic.LockTargetState.SECURED) ? "arm" : "disarm";

    console.log(`Set Alarm state to ${alarmState}`);

    //make a request to get auth token
    authorize()
        .then(response => response.json())//load it as json
        //save the token to global variable
        .then(data => {
            access_token = data.access_token;
            refresh_token = data.refresh_token;

            //fetch current url using new token.
            return fetch(_HOST + "/api/panel/mode/",
                {
                    method: 'POST',
                    body: `area=1&mode=${alarmState}`,
                    headers: {
                        "Authorization": "Bearer " + access_token,
                        'Accept': 'application/json, application/xml, text/plain, text/html, *.*',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    }
                }
            );
        })
        .then(response =>
            response.json()) // Load the response as json
        .then(res => {
                       
            var currentState = (state == Characteristic.LockTargetState.SECURED) ? Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;
            this.service.setCharacteristic(Characteristic.LockCurrentState, currentState);
            console.log(`Sucessful Setting State to ${currentState}`);
            callback(null, true); // success

        }).catch((response) => {
            this.log('catch')
            this.log(response)
        });    
}

YaleAlarm.prototype.getServices = function() {
    return [this.service];
}


function getAuthHeaders() {
    return {
        "Authorization": "Bearer " + access_token
    }
}

function authorize() {
    //var payload = `grant_type=refresh_token&refresh_token=${refresh_token}`;
  //  if (refresh_token === "") {
        payload = `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
   // };
    
    return fetch(_HOST + "/o/token/",
        {
            method: 'POST',
            body: payload,
            headers: {
                "Authorization": "Basic " + yaleAuthToken,
                'Accept': 'application/json, application/xml, text/plain, text/html, *.*',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            }
        }
    );

}