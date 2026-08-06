// ─── Dynamic Footer Year ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// ─── Employment Duration ─────────────────────────────────────
function calculateEmploymentDuration(startYear, startMonth, endYear = null, endMonth = null) {
  const startDate = new Date(startYear, startMonth - 1);
  const endDate = endYear ? new Date(endYear, endMonth - 1) : new Date();
  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  if (months < 0) { years -= 1; months += 12; }
  return `${years} yr${years !== 1 ? "s" : ""} ${months} mo${months !== 1 ? "s" : ""}`;
}

document.addEventListener("DOMContentLoaded", function () {
  const cgiEl = document.getElementById("cgi-duration");
  const sogetiEl = document.getElementById("sogeti-duration");
  if (cgiEl) cgiEl.innerText = calculateEmploymentDuration(2024, 11);
  if (sogetiEl) sogetiEl.innerText = calculateEmploymentDuration(2022, 11, 2024, 11);
});

// ─── Blog Posts ───────────────────────────────────────────────
// Add new blog post URLs to this array to have them appear automatically.
const blogPosts = [
  "blog/oscar-stensson.html",
  // Add more posts here, e.g.: "blog/my-next-post.html"
];

async function fetchMetadata(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, "text/html");
    return {
      title: doc.querySelector("meta[name='title']")?.content || "Untitled Post",
      description: doc.querySelector("meta[name='description']")?.content || "",
      date: doc.querySelector("meta[name='date']")?.content || "",
      image: doc.querySelector("meta[name='image']")?.content || "./assets/oscar.png",
      url,
    };
  } catch (err) {
    console.error("Failed to fetch blog metadata for:", url, err);
    return null;
  }
}

function renderBlogCard(post) {
  const card = document.createElement("div");
  card.classList.add("blog-card");
  const dateStr = post.date ? new Date(post.date).toLocaleDateString("en-SE", { year: "numeric", month: "short", day: "numeric" }) : "";
  card.innerHTML = `
    <img src="${post.image}" class="blog-image" alt="${post.title}" loading="lazy">
    <div class="blog-content">
      ${dateStr ? `<p class="blog-date"><i class="fa-regular fa-calendar"></i> ${dateStr}</p>` : ""}
      <p class="blog-title">${post.title}</p>
      <p class="blog-description">${post.description}</p>
      <a href="${post.url}" class="btn btn-primary btn-sm">Read more</a>
    </div>
  `;
  return card;
}

document.addEventListener("DOMContentLoaded", async function () {
  const blogContainer = document.getElementById("blog-posts-container");
  const homeBlogContainer = document.getElementById("home-blog-container");

  if (!blogContainer && !homeBlogContainer) return;

  const emptyMsg = `<p style="color:#64748b;font-size:0.9rem;">No posts available yet.</p>`;

  if (blogPosts.length === 0) {
    if (blogContainer) blogContainer.innerHTML = emptyMsg;
    if (homeBlogContainer) homeBlogContainer.innerHTML = emptyMsg;
    return;
  }

  const results = await Promise.all(blogPosts.map(fetchMetadata));
  const valid = results.filter(Boolean);

  if (valid.length === 0) {
    if (blogContainer) blogContainer.innerHTML = emptyMsg;
    if (homeBlogContainer) homeBlogContainer.innerHTML = emptyMsg;
    return;
  }

  if (blogContainer) valid.forEach(post => blogContainer.appendChild(renderBlogCard(post)));
  if (homeBlogContainer) valid.slice(0, 3).forEach(post => homeBlogContainer.appendChild(renderBlogCard(post)));
});
