// Function to calculate employment duration dynamically
function calculateEmploymentDuration(startYear, startMonth, endYear = null, endMonth = null) {
    let startDate = new Date(startYear, startMonth - 1);
    let endDate = endYear ? new Date(endYear, endMonth - 1) : new Date();
  
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    if (months < 0) {
      years -= 1;
      months += 12;
    }
  
    return `${years} yr${years !== 1 ? 's' : ''} ${months} mo${months !== 1 ? 's' : ''}`;
  }
  
  // Update durations on page load
  document.addEventListener("DOMContentLoaded", function () {
    let cgiElement = document.getElementById("cgi-duration");
    let sogetiElement = document.getElementById("sogeti-duration");
  
    if (cgiElement) cgiElement.innerText = calculateEmploymentDuration(2024, 11);
    if (sogetiElement) sogetiElement.innerText = calculateEmploymentDuration(2022, 11, 2024, 11);
  });


  //Blog posts functionality
  document.addEventListener("DOMContentLoaded", async function () {
    const blogContainer = document.getElementById("blog-posts-container");

    // Define your blog post URLs here
    const blogPosts = [
        "blog/oscar-stensson.html"
        // Add more blog post URLs dynamically later
    ];

    if (blogPosts.length === 0) {
        blogContainer.innerHTML = `<p class="text-muted">No posts currently available yet.</p>`;
    } else {
        // Function to fetch and parse metadata from each blog post
        async function fetchMetadata(url) {
            try {
                console.log(`Fetching metadata from: ${url}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, "text/html");

                // Extract metadata
                const title = doc.querySelector("meta[name='title']")?.content || "Untitled Post";
                const description = doc.querySelector("meta[name='description']")?.content || "No description available.";
                const date = doc.querySelector("meta[name='date']")?.content || "Unknown Date";
                const image = doc.querySelector("meta[name='image']")?.content || "./assets/default-blog.jpg";

                return { title, description, date, url, image };
            } catch (error) {
                console.error("Error fetching metadata for:", url, error);
                return null;
            }
        }

        // Fetch all blog metadata dynamically
        const metadataPromises = blogPosts.map(url => fetchMetadata(url));
        const metadataResults = await Promise.all(metadataPromises);

        // Render blog post cards
        metadataResults.forEach(post => {
            if (post) {
                console.log("Rendering post:", post.title);
                const postCard = document.createElement("div");
                postCard.classList.add("blog-card");

                postCard.innerHTML = `
                    <img src="${post.image}" class="blog-image" alt="${post.title}">
                    <div class="blog-content">
                        <h5>${post.title}</h5>
                        <p class="blog-date"><i class="fa-solid fa-calendar"></i> ${new Date(post.date).toDateString()}</p>
                        <p>${post.description}</p>
                        <a href="${post.url}" class="btn btn-primary">Read More →</a>
                    </div>
                `;

                blogContainer.appendChild(postCard);
            }
        });

        // If no valid posts were found, show message
        if (metadataResults.every(post => post === null)) {
            blogContainer.innerHTML = `<p class="text-muted">No posts currently available yet.</p>`;
        }
    }
});




  