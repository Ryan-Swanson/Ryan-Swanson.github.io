function createNavbar() {
  const navbar = `
  <nav class="navbar navbar-expand-md navbar-dark fixed-top">
      <a class="navbar-brand" href="index.html">Ryan Swanson</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ml-auto"> <!-- Add the mr-auto class here -->
          <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
          <li class="nav-item"><a class="nav-link" href="#">About</a></li>
          <li class="nav-item"><a class="nav-link" href="#">Research</a></li>
          <li class="nav-item"><a class="nav-link" href="#">Data</a></li>
          <li class="nav-item"><a class="nav-link" href="#">Optimizations</a></li>
          <li class="nav-item"><a class="nav-link" href="#">Notes</a></li>
        </ul>
      </div>
    </nav>
  `;
  document.getElementById('header').innerHTML = navbar;
}

function createStarryBackground() {
  const starsCount = 30; // Adjust this value to change the number of stars
  const starsColors = ['#f9d71c'/*, '#e6e6e6'*/];
  const navbar = document.querySelector('.navbar');
  const starsContainer = document.createElement('div');
  starsContainer.style.position = 'absolute';
  starsContainer.style.top = 0;
  starsContainer.style.left = 0;
  starsContainer.style.width = '100%';
  starsContainer.style.height = '100%';
  starsContainer.style.pointerEvents = 'none'; // Add this line

  for (let i = 0; i < starsCount; i++) {
    const xPos = Math.random() * 100;
    const yPos = Math.random() * 100;
    const starSize = Math.random() * 1;

    const star = document.createElement('div');
    star.style.position = 'absolute';
    star.style.width = `${starSize}rem`;
    star.style.height = `${starSize}rem`;
    star.style.left = `${xPos}%`;
    star.style.top = `${yPos}%`;
    star.style.borderRadius = '50%';

    const starColor = starsColors[Math.floor(Math.random() * starsColors.length)];
    star.style.backgroundColor = starColor;
    starsContainer.appendChild(star);
  }

  navbar.appendChild(starsContainer);
}

function createFooter() {
  const footer = `
      <footer class="bg-dark text-white text-center py-3">
        <p>&copy; ${new Date().getFullYear()} Ryan Swanson. All rights reserved.</p>
      </footer>
    `;
  document.getElementById('footer').innerHTML = footer;
}

function loadBlogPosts() {
  fetch('blog-posts.json')
    .then(response => response.json())
    .then(posts => {
      const projectContainer = document.getElementById('project-container');
      posts.forEach((post, index) => {
        const postElement = `
            <div class="col-md-4">
              <div class="about card">
                <img src="${post.image}" class="card-img-top mx-auto" alt="${post.title}">
                <div class="card-body">
                  <h5 class="card-title">${post.title}</h5>
                  <p class="card-text">${post.description}</p>
                  <a href="blog-post.html?postId=${index}" class="btn btn-success">View Post</a>
                </div>
              </div>
            </div>
          `;
        projectContainer.innerHTML += postElement;
      });
    })
    .catch(error => {
      console.error('Error fetching blog posts:', error);
    });
}

function loadBlogPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('postId');

  if (postId) {
    fetch('blog-posts.json')
      .then(response => response.json())
      .then(posts => {
        const post = posts[postId];

        if (post) {
          // Initialize the Showdown converter
          const converter = new showdown.Converter();

          // Convert the Markdown content to HTML
          const contentHtml = converter.makeHtml(post.content);

          // Update the blog post template with the image, title, and HTML content
          document.querySelector('.blog-post-image').src = post.image;
          document.querySelector('.blog-post-image').alt = post.title;
          document.title = post.title;
          document.querySelector('article h1').textContent = post.title;
          document.querySelector('article p').innerHTML = contentHtml;
          // Add more content as needed
        } else {
          console.error('Invalid postId:', postId);
        }
      })
      .catch(error => {
        console.error('Error fetching blog post:', error);
      });
  }
}

// Define available styles
const styles = ['styles.css', 'styles2.css', 'styles3.css'];

// Function to get next stylesheet
function getNextStylesheet(currentStylesheet) {
  const index = styles.indexOf(currentStylesheet);
  return styles[(index + 1) % styles.length];
}

// Function to switch the stylesheet
function switchStylesheet() {
  const currentStyle = localStorage.getItem('currentStyle') || styles[0];
  const nextStyle = getNextStylesheet(currentStyle);
  
  const stylesheet = document.getElementById('stylesheet');
  stylesheet.href = nextStyle;

  localStorage.setItem('currentStyle', nextStyle);
}

// Function to create the style switcher button
function createStyleSwitcher() {
  // Create button for switching styles
  const switchButton = document.createElement('button');
  switchButton.className = 'btn btn-secondary';
  switchButton.textContent = 'Switch Style';
  switchButton.addEventListener('click', switchStylesheet);

  // Append button to navbar
  const navbarNav = document.querySelector('.navbar-nav');
  navbarNav.appendChild(switchButton);
}

// On load, set the stylesheet to the one stored in localStorage
window.addEventListener('DOMContentLoaded', () => {
  const currentStyle = localStorage.getItem('currentStyle') || styles[0];
  const stylesheet = document.getElementById('stylesheet');
  stylesheet.href = currentStyle;
});


document.addEventListener('DOMContentLoaded', () => {
  createNavbar();
  createFooter();
  createStarryBackground();
  createStyleSwitcher();
  if (document.getElementById('project-container')) {
    loadBlogPosts();
  } else if (document.querySelector('article')) {
    loadBlogPost();
  }
});