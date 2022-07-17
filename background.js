const CLIENT_ID = encodeURIComponent("n5uf2u5tb0ywii0t7oba8rn08zspsj");
const REDIRECT_URI = encodeURIComponent(
  "https://ogdijofedpjpofblpiecjpcgmkdddkap.chromiumapp.org/"
);
const RESPONSE_TYPE = encodeURIComponent("token id_token");
const SCOPE = encodeURIComponent("openid user:read:email");
const CLAIMS = encodeURIComponent(
  JSON.stringify({
    id_token: { email: null, email_verified: null },
  })
);
const STATE = encodeURIComponent(
  "meet" + Math.random().toString(36).substring(2, 15)
);
const GREEN = [
  "Minecraft",
  "Just Chatting",
  "Fall Guys",
  "Among Us",
  "Clash Royale",
  "Mario Kart 8 Deluxe",
  "BombParty",
  "Special Events",
  "Mario Kart 8",
  "Talkin Ben the Dog",
  "Geometry Dash",
  "BATTLESHIP",
  "Codenames",
  "Jackbox Party Packs",
  "The Jackbox Party Pack 6",
  "The Jackbox Party Pack 7",
  "The Jackbox Party Pack 8",
  "The Jackbox Party Pack 9",
  "The Jackbox Party Pack 10",
  "The Jackbox Party Pack 11",
  "The Jackbox Party Pack 12",
  "The Jackbox Party Pack 13",
  "The Jackbox Party Pack 14",
  "The Jackbox Party Pack 15",
];
const YELLOW = ["Slots", "Chess", "Slither.io"];

let user_signed_in = false;
let ACCESS_TOKEN = null;
let interval_id = null;

function create_twitch_endpoint() {
  let nonce = encodeURIComponent(
    Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
  );

  let openid_url = `https://id.twitch.tv/oauth2/authorize
?client_id=${CLIENT_ID}
&redirect_uri=${REDIRECT_URI}
&response_type=${RESPONSE_TYPE}
&scope=${SCOPE}
&claims=${CLAIMS}
&state=${STATE}
&nonce=${nonce}
`;

  return openid_url;
}

// Twitch login
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "login") {
    if (user_signed_in) {
      console.log("User is already signed in.");
    } else {
      chrome.identity.launchWebAuthFlow(
        {
          url: create_twitch_endpoint(),
          interactive: true,
        },
        function (redirect_url) {
          console.log(redirect_url);
          if (
            chrome.runtime.lastError ||
            redirect_url.includes("error=access_denied")
          ) {
            sendResponse({ message: "fail" });
          } else {
            let id_token = redirect_url.substring(
              redirect_url.indexOf("id_token=") + 9
            );
            id_token = id_token.substring(0, id_token.indexOf("&"));
            ACCESS_TOKEN = redirect_url.substring(
              redirect_url.indexOf("access_token=") + 13
            );
            ACCESS_TOKEN = ACCESS_TOKEN.substring(0, ACCESS_TOKEN.indexOf("&"));
            const user_info = JSON.parse(atob(id_token.split(".")[1]));
            if (
              user_info.iss === "https://id.twitch.tv/oauth2" &&
              user_info.aud === CLIENT_ID
            ) {
              user_signed_in = true;

              interval_id = setInterval(() => {
                fetch("https://id.twitch.tv/oauth2/validate", {
                  headers: {
                    Authorization: "OAuth " + ACCESS_TOKEN,
                  },
                })
                  .then((res) => {
                    console.log(res.status);
                    if (res.status === 401) {
                      user_signed_in = false;
                      clearInterval(interval_id);
                    }
                  })
                  .catch((err) => console.log(err));
              }, 3600000);

              chrome.action.setPopup(
                { popup: "./popup-signed-in.html" },
                () => {
                  sendResponse({ message: "success" });
                }
              );
            }
          }
        }
      );
    }
    return true;
  } else if (request.message === "logout") {
    user_signed_in = false;
    chrome.browserAction.setPopup({ popup: "./popup.html" }, () => {
      sendResponse({ message: "success" });
    });
    return true;
  }
});

function setIconToColor(color) {
  colorHex = {
    red: "#FB6962",
    green: "#0CC078",
    yellow: "#FCFC99",
    grey: "#808080",
    black: "#000000",
  };

  const canvas = new OffscreenCanvas(16, 16);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 16, 16);
  context.fillStyle = colorHex[color];
  //make circle with radius of 8
  context.beginPath();
  context.arc(8, 8, 8, 0, 2 * Math.PI);
  context.fill();
  if (color === "black") {
    context.strokeStyle = "#FB6962";
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(16, 16);
    context.moveTo(16, 0);
    context.lineTo(0, 16);
    context.stroke();
  }
  const imageData = context.getImageData(0, 0, 16, 16);
  chrome.action.setIcon({ imageData });
}

function createAlarm() {
  chrome.alarms.get("default", (alarm) => {
    if (alarm === undefined) {
      chrome.alarms.create("default", {
        when: Date.now(),
        periodInMinutes: 0.1,
      });
    }
  });
  console.log("Alarm created");
}

function removeAlarm() {
  chrome.alarms.clear("default");
  console.log("Alarm removed");
}

function onAlarm() {
  if (user_signed_in) {
    fetch(`https://api.twitch.tv/helix/streams?user_login=xqc`, {
      headers: {
        Authorization: "Bearer " + ACCESS_TOKEN,
        "Client-ID": CLIENT_ID,
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(response.statusText);
        }
      })
      .then((data) => {
        if (data.data.length === 0) {
          setIconToColor("grey");
        } else {
          if (GREEN.find((element) => element === data.data[0].game_name)) {
            setIconToColor("green");
          } else if (
            YELLOW.find((element) => element === data.data[0].game_name)
          ) {
            setIconToColor("yellow");
          } else {
            setIconToColor("red");
          }
        }
      })
      .catch(() => setIconToColor("black"));
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setIconToColor("black");
  createAlarm();
});
chrome.runtime.onStartup.addListener(() => {
  setIconToColor("black");
  createAlarm();
});

//create alarm event listener
chrome.alarms.onAlarm.addListener(onAlarm);
