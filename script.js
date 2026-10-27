let users = JSON.parse(localStorage.users || "[]");
let posts = JSON.parse(localStorage.posts || "[]");
let current = localStorage.current || null;
let viewedProfile = null;

const $ = id => document.getElementById(id);
const me = () => users.find(u => u.id == current);

function save() {
  localStorage.users = JSON.stringify(users);
  localStorage.posts = JSON.stringify(posts);
}

function normalizeData() {
  users.forEach(u => {
    u.followers ||= [];
    u.following ||= [];
  });

  posts.forEach(p => {
    p.likes ||= [];
    p.comments ||= [];
    p.reposts ||= [];
  });

  save();
}

normalizeData();

/* LOGIN AND REGISTER */

function showReg() {
  $("login").classList.add("hide");
  $("reg").classList.remove("hide");
}

function showLogin() {
  $("reg").classList.add("hide");
  $("login").classList.remove("hide");
}

function register() {
  const name = $("rn").value.trim();
  const username = $("ru").value.trim().toLowerCase();
  const password = $("rp").value.trim();

  if (!name || !username || !password)
    return alert("Fill all fields");

  if (users.some(x => x.username === username))
    return alert("Username already exists");

  const u = {
    id: Date.now(),
    name,
    username,
    password,
    followers: [],
    following: []
  };

  users.push(u);
  defaults(u);
  save();

  alert("Account created!");
  showLogin();
}

function login() {
  const username = $("lu").value.trim().toLowerCase();
  const password = $("lp").value.trim();

  const u = users.find(x =>
    x.username === username && x.password === password
  );

  if (!u)
    return $("err").innerText = "Invalid username or password";

  current = u.id;
  localStorage.current = current;

  defaults(u);

  $("auth").classList.add("hide");
  $("app").classList.remove("hide");

  page("home");
}

function logout() {
  localStorage.removeItem("current");
  location.reload();
}

/* DEFAULT USERS */

function defaults(u) {
  const names = [
    ["Arun", "arun"],
    ["Priya", "priya"],
    ["Kavin", "kavin"]
  ];

  names.forEach(([name, username], i) => {
    let f = users.find(x => x.username === username);

    if (!f) {
      f = {
        id: Date.now() + i + 1,
        name,
        username,
        password: "1234",
        followers: [],
        following: []
      };
      users.push(f);
    }

    f.followers ||= [];
    f.following ||= [];

    if (!u.followers.some(id => id == f.id))
      u.followers.push(f.id);

    if (!f.following.some(id => id == u.id))
      f.following.push(u.id);
  });

  save();
}

/* NAVIGATION */

function page(name) {
  ["home", "explore", "profile"].forEach(p =>
    $(p).classList.toggle("hide", p !== name)
  );

  if (name === "home") feed();
  if (name === "explore") displayUsers();

  if (name === "profile") {
    viewedProfile = null;
    profile();
  }
}

/* CREATE POST */

function createPost() {
  const text = $("post").value.trim();

  if (!text) return alert("Write something!");

  const u = me();

  const p = {
    id: Date.now(),
    userId: u.id,
    text,
    likes: [...u.followers],
    comments: [],
    reposts: []
  };

  posts.unshift(p);

  $("post").value = "";
  save();
  feed();
}

/* SAFE HTML */

function safe(value) {
  return String(value).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

/* PROFILE LINKS */

function profileLink(u) {
  if (!u) return "Unknown user";

  return `<span class="profile-link"
    onclick="openProfile(${u.id})">${safe(u.name)}</span>
    <span>@${safe(u.username)}</span>`;
}

/* POST DISPLAY */

function postHTML(p, repostedBy = null) {
  const u = users.find(x => x.id == p.userId);
  if (!u) return "";

  p.likes ||= [];
  p.comments ||= [];
  p.reposts ||= [];

  const liked = p.likes.some(id => id == current);
  const reposted = p.reposts.some(id => id == current);

  const likes = p.likes.map(id => {
    const x = users.find(a => a.id == id);
    return x ? `<small>❤️ ${profileLink(x)}</small>` : "";
  }).join("");

  const repostNames = p.reposts.map(id => {
    const x = users.find(a => a.id == id);
    return x ? `<small>🔁 ${profileLink(x)}</small>` : "";
  }).join("");

  return `
    <div class="post">
      ${repostedBy ? `
        <div class="repost-label">
          🔁 ${profileLink(repostedBy)} reposted
        </div>
      ` : ""}

      <div>${profileLink(u)}</div>
      <p>${safe(p.text)}</p>

      <button onclick="like(${p.id})">
        ${liked ? "❤️" : "♡"} ${p.likes.length}
      </button>

      <button onclick="comment(${p.id})">
        💬 ${p.comments.length}
      </button>

      <button onclick="repost(${p.id})">
        ${reposted ? "↩ Undo Repost" : "🔁 Repost"}
        (${p.reposts.length})
      </button>

      ${p.userId == current ? `
        <button onclick="del(${p.id})">🗑 Delete</button>
      ` : ""}

      ${likes ? `<div class="likebox">${likes}</div>` : ""}

      ${repostNames ? `
        <div class="repostbox">
          <b>Reposted by:</b>
          ${repostNames}
        </div>
      ` : ""}
    </div>
  `;
}

/* HOME FEED */

function feed() {
  const u = me();
  if (!u) return;

  const items = [];

  posts.forEach(p => {
    if (p.userId == u.id ||
        u.following.some(id => id == p.userId)) {
      items.push({
        post: p,
        reposter: null
      });
    }

    (p.reposts || []).forEach(id => {
      const reposter = users.find(x => x.id == id);

      if (reposter &&
          (id == u.id || u.following.some(fid => fid == id))) {
        items.push({
          post: p,
          reposter
        });
      }
    });
  });

  items.sort((a, b) => b.post.id - a.post.id);

  $("feed").innerHTML = items.map(item =>
    postHTML(item.post, item.reposter)
  ).join("") || "<p class='post'>No chirps yet 👋</p>";
}

/* LIKE */

function like(id) {
  const p = posts.find(x => x.id == id);
  if (!p) return;

  p.likes ||= [];

  const i = p.likes.findIndex(x => x == current);

  if (i < 0) p.likes.push(+current);
  else p.likes.splice(i, 1);

  save();
  refreshViews();
}

/* REPOST */

function repost(id) {
  const p = posts.find(x => x.id == id);
  if (!p) return;

  p.reposts ||= [];

  const i = p.reposts.findIndex(x => x == current);

  if (i < 0) {
    if (p.userId == current)
      return alert("You cannot repost your own post.");

    p.reposts.push(+current);
  } else {
    p.reposts.splice(i, 1);
  }

  save();
  refreshViews();
}

/* DELETE */

function del(id) {
  if (!confirm("Delete this Chirp?")) return;

  posts = posts.filter(p => p.id != id);
  save();
  refreshViews();
}

/* COMMENT */

function comment(id) {
  const p = posts.find(x => x.id == id);
  if (!p) return;

  const text = prompt("Write a comment:");
  if (!text || !text.trim()) return;

  p.comments ||= [];
  p.comments.push({
    userId: +current,
    text: text.trim()
  });

  save();
  refreshViews();
}

/* EXPLORE */

function userHTML(x) {
  const following = me().following.some(id => id == x.id);

  return `
    <div class="user">
      <div>
        ${profileLink(x)}<br>
        <small>ID: ${x.id}</small>
      </div>

      <button onclick="follow(${x.id})">
        ${following ? "Following" : "Follow"}
      </button>
    </div>
  `;
}

function displayUsers() {
  const u = me();

  $("users").innerHTML = users
    .filter(x => x.id != u.id)
    .map(userHTML)
    .join("") || "<p class='post'>No users found</p>";
}

function searchUsers() {
  const q = $("search").value.toLowerCase();

  $("users").innerHTML = users
    .filter(x =>
      x.id != current &&
      (x.name.toLowerCase().includes(q) ||
       x.username.toLowerCase().includes(q))
    )
    .map(userHTML)
    .join("") || "<p class='post'>No users found</p>";
}

/* FOLLOW / UNFOLLOW */

function follow(id) {
  const u = me();
  const x = users.find(a => a.id == id);

  if (!x || x.id == u.id) return;

  u.following ||= [];
  x.followers ||= [];

  const i = u.following.findIndex(fid => fid == id);

  if (i < 0) {
    u.following.push(x.id);

    if (!x.followers.some(fid => fid == current))
      x.followers.push(+current);
  } else {
    u.following.splice(i, 1);
    x.followers = x.followers.filter(fid => fid != current);
  }

  save();
  refreshViews();
}

/* OPEN USER PROFILE */

function openProfile(id) {
  const u = users.find(x => x.id == id);
  if (!u) return;

  viewedProfile = u.id;

  $("home").classList.add("hide");
  $("explore").classList.add("hide");
  $("profile").classList.remove("hide");

  $("backBtn").classList.remove("hide");

  profile();
}

function backToProfile() {
  viewedProfile = null;
  profile();
}

/* PROFILE WITH POST COUNT */

function profile() {
  const u = users.find(x =>
    x.id == (viewedProfile ?? current)
  );

  if (!u) return;

  const ownProfile = u.id == current;

  const userPostCount = posts.filter(
    p => p.userId == u.id
  ).length;

  $("profileHeading").innerText =
    ownProfile ? "My Profile" : "User Profile";

  $("postsHeading").innerText =
    ownProfile ? "My Chirps" : `${u.name}'s Chirps`;

  $("backBtn").classList.toggle("hide", ownProfile);

  $("profileBox").innerHTML = `
    <h2>${safe(u.name)}</h2>
    <p>@${safe(u.username)}</p>

    <button onclick="showList('followers', ${u.id})">
      Followers: ${u.followers.length}
    </button>

    <button onclick="showList('following', ${u.id})">
      Following: ${u.following.length}
    </button>

    <button onclick="showUserPosts(${u.id})">
      Posts: ${userPostCount}
    </button>
  `;

  $("list").innerHTML = "";

  $("myPosts").innerHTML = posts
    .filter(p => p.userId == u.id)
    .map(postHTML)
    .join("") || "<p class='post'>No chirps yet</p>";
}

/* SHOW USER POSTS */

function showUserPosts(userId) {
  const u = users.find(x => x.id == userId);
  if (!u) return;

  $("list").innerHTML = `
    <h3>${safe(u.name)}'s Posts</h3>
  `;

  $("myPosts").innerHTML = posts
    .filter(p => p.userId == userId)
    .map(postHTML)
    .join("") || "<p class='post'>No chirps yet</p>";
}

/* FOLLOWERS / FOLLOWING LIST */

function showList(type, userId = current) {
  const u = users.find(x => x.id == userId);
  if (!u) return;

  const ids = u[type] || [];

  $("list").innerHTML = `
    <h3>${type.toUpperCase()}</h3>
    ${ids.map(id => {
      const x = users.find(a => a.id == id);
      return x ? userHTML(x) : "";
    }).join("") || "<p class='post'>No users</p>"}
  `;
}

/* REFRESH */

function refreshViews() {
  save();

  if (!$("home").classList.contains("hide")) feed();
  if (!$("explore").classList.contains("hide")) displayUsers();
  if (!$("profile").classList.contains("hide")) profile();
}

/* DARK MODE */

function theme() {
  document.body.classList.toggle("dark");

  localStorage.theme =
    document.body.classList.contains("dark")
      ? "dark"
      : "light";
}

/* START */

if (localStorage.theme == "dark")
  document.body.classList.add("dark");

if (current && me()) {
  $("auth").classList.add("hide");
  $("app").classList.remove("hide");

  defaults(me());
  page("home");
}