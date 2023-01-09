let stories = [{
    "title": "The Mouse",
    "date": "2022-01-01",
    "story": "The mouse scurried across the floor, its tiny paws making no sound."
},
{
    "title": "The Cat",
    "date": "2022-01-02",
    "story": "The cat watched the mouse, its green eyes glowing in the dark."
},
{
    "title": "The Dog",
    "date": "2022-01-03",
    "story": "The dog barked at the cat, its tail wagging with excitement."
},
{
    "title": "The Tree",
    "date": "2022-01-04",
    "story": "The tree stood tall, its leaves rustling in the gentle breeze."
},
{
    "title": "The Lake",
    "date": "2022-01-05",
    "story": "The lake shone like a mirror, its surface as still as glass."
},
{
    "title": "The Flower",
    "date": "2022-01-06",
    "story": "The flower bloomed, its petals unfurling in the warm sun."
},
{
    "title": "The Mountain",
    "date": "2022-01-07",
    "story": "The mountain loomed, its peak hidden in the clouds."
},
{
    "title": "The Star",
    "date": "2022-01-08",
    "story": "The star twinkled, its light shining brightly in the night sky."
}]





function buildStories(stories) {
    var grid = document.getElementById("grid");

    for (let i = 0; i < stories.length; i += 1) {
        let title = stories[i].title;
        let date = stories[i].date;
        let storyText = stories[i].story;

        var div = document.createElement("div");
        div.classList.add("grid-item");

        var titleElem = document.createElement("h3");
        titleElem.innerHTML = title;
        div.appendChild(titleElem);

        var dateElem = document.createElement("p");
        dateElem.innerHTML = date;
        div.appendChild(dateElem);

        var storyElem = document.createElement("p");
        storyElem.innerHTML = storyText;
        div.appendChild(storyElem);

        grid.appendChild(div);
    }
}



buildStories(stories);
