var express = require('express')
const fs = require('fs');
var cors = require('cors');

const app = express();
app.use(cors());
const PORT = 8081

var config = JSON.parse(fs.readFileSync('private.json'));

const Oauth = 'Bearer ' + config["Oauth"]
const ClientId = config["ClientId"]
const CHECK_ONLINE_URL = 'https://api.twitch.tv/helix/streams?'
const TEAM_URL = 'https://api.twitch.tv/helix/teams?id=13648'
const GET_CH_INFO = "https://api.twitch.tv/helix/users?"

var allowedOrigins = ['http://localhost:8080'];

headers = {
  "Content-Type": 'application/json',
  "Client-Id": ClientId,
  "Authorization": Oauth,
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
  for (var i = 0; i < team_members.length; i++) {
    memb_names.push(team_members[i]['user_login']);
  }
  return memb_names;
}

async function checkOnline(members) {
  var url = CHECK_ONLINE_URL;
  for (var i = 0; i < members.length; i++) 
    url += ("user_login=" + members[i] + "&");
  
  url = url.slice(0, -1);
  var response = await fetch(url, {
    method: 'GET',
    headers: headers
  });
  const jsonData = await response.json();
  var live = [];
  for (var i = 0; i < jsonData['data'].length; i++) {
    if (jsonData['data'][i]["type"] == "live") {
      live.push({
        "channel": jsonData['data'][i]["user_id"],
        "what": jsonData['data'][i]["game_name"],
        "view_count": jsonData['data'][i]["viewer_count"]
      });
    }
  }

  return live;
};

async function channelInfo(members) {
  var url = GET_CH_INFO;
  for (var i = 0; i < members.length; i++) 
    url += ("login=" + members[i] + "&");
  url = url.slice(0, -1);
  var response = await fetch(url, {
    method: 'GET',
    headers: headers
  });
  const jsonData = await response.json();
  var info = [];
  for (var i = 0; i < jsonData['data'].length; i++) {
    info.push({
      "login": jsonData['data'][i]["login"],
      "toDisplay": jsonData['data'][i]["display_name"],
      "id": jsonData['data'][i]["id"],
      "pfp": jsonData['data'][i]["profile_image_url"]
    });
  }
  return info;
};

app.get('/get_online_status', (req, res) => {
  statuses = pullRedisCache()
  res.send(statuses);
});

app.use(cors({
  origin: function (origin, callback) {    // allow requests with no origin 
    // (like mobile apps or curl requests)
    if (!origin) return callback(null, true); if (allowedOrigins.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not ' +
        'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    } return callback(null, true);
  }
}));

function toRedis(info) {
  fs.writeFileSync('cache.json', JSON.stringify(info));
}

function pullRedisCache() {
  var cache = JSON.parse(fs.readFileSync('cache.json'));
  var results = []
  for (const [key, value] of Object.entries(cache)) {
    results.push(value)
  }
  var sortedMembers = [
    ...results.filter(({ online }) => online),
    ...results.filter(({ online }) => !online)
  ];
  return sortedMembers;
}

function updateCache() {
  (async () => {
    var members = await getTeamMembers();
    var toCacheInfo = {}
    Promise.all([checkOnline(members), channelInfo(members)]).then((info) => {
      for (var i = 0; i < info.length; i++) { 
        for (var j = 0; j < info[i].length; j++) { 
          if ("pfp" in info[i][j]) {
            channel_id = info[i][j]['id'];
            if (channel_id in toCacheInfo) {
              toCacheInfo[channel_id]["pfp"] = info[i][j]['pfp']
              toCacheInfo[channel_id]["login"] = info[i][j]['login']
              toCacheInfo[channel_id]["toDisplay"] = info[i][j]['toDisplay']
            } else {
              toCacheInfo[channel_id] = info[i][j]
            }
          } else {
            channel_id = info[i][j]['channel'];
            if (channel_id in toCacheInfo) {
              toCacheInfo[channel_id]["online"] = true
              toCacheInfo[channel_id]["live_game"] = info[i][j]['what']
              toCacheInfo[channel_id]["view_count"] = info[i][j]['view_count']
            } else {
              toCacheInfo[channel_id] = info[i][j]
              toCacheInfo[channel_id]["online"]  = true
            }
          }
        }
      toRedis(toCacheInfo);
      }
    });
  })();
}

/* EXECUTE ON STARTUP - UPDATE CACHE */
updateCache();
app.listen(PORT);
console.log('Server started at http://localhost:' + PORT);