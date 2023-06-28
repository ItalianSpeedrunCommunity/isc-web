var express = require('express')
const fs = require('fs');
var cors = require('cors');

const app = express();
app.use(cors());
const PORT = 8081

var config = JSON.parse(fs.readFileSync('private.json'));

const Oauth = 'Bearer ' + config["Oauth"]
const ClientId = config["ClientId"]
const CHECK_ONLINE_URL = 'https://api.twitch.tv/helix/streams?user_login='
const TEAM_URL = 'https://api.twitch.tv/helix/teams?id=13648'

var allowedOrigins = ['http://localhost:8080'];

headers = {
  "Content-Type": 'application/json',
  "Client-Id": ClientId,
  "Authorization": Oauth,
}

async function getStatuses(members) {
  var memberStatus = []
  let requests = members.map(channel => {
    return new Promise((resolve, reject) => 
     {resolve(checkOnline(channel))})
   })
   return Promise.all(requests).then((online) => { 
     online.forEach(res => {
       if (res) 
         memberStatus.push(res)
     })
   }).catch(err => console.log(err)).then((_) => {return memberStatus})
}

async function getTeamMembers() {
  var team_members_json = await fetch(TEAM_URL, {
    method: 'GET',
    headers: headers
  })
  .then((response) => response.json())
  .then((json) => json);
  var team_members = team_members_json['data'][0]['users']
  var memb_names = []
  for (var i = 0; i < team_members.length; i++){
    memb_names.push(team_members[i]['user_login']);
  }
  return memb_names;
}

async function checkOnline(channelName) {
  var url = CHECK_ONLINE_URL + channelName;
  var response = await fetch(url, {
      method: 'GET',
      headers: headers
  });
  var result = {
    'channel': channelName
  };
  const jsonData = await response.json();
  var online = false;
  if (jsonData['data'].length > 0) {
    if (jsonData['data'][0]["type"] == "live") {
      online = true;
    }
  }
  result['online'] = online;

  return result;
};

app.get('/get_online_status', (req, res) => {
  statuses = JSON.parse(fs.readFileSync('cache.json'))
  const sortedMembers = [
    ...statuses.filter(({online}) => online),
    ...statuses.filter(({online}) => !online)
];
  res.send(sortedMembers);
});

app.use(cors({
  origin: function(origin, callback){    // allow requests with no origin 
    // (like mobile apps or curl requests)
    if(!origin) return callback(null, true);    if(allowedOrigins.indexOf(origin) === -1){
      var msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }    return callback(null, true);
  }
}));

/* EXECUTE ON STARTUP */
(async() => {
  var members = await getTeamMembers();
  (async() => {
    var memberStatus = await getStatuses(members);
    console.log(memberStatus)
    fs.writeFileSync('cache.json', JSON.stringify(memberStatus));
  })();
})();
app.listen(PORT);
console.log('Server started at http://localhost:' + PORT);