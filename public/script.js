document.getElementById("uploadForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  
  const formData = new FormData(event.target);

  const videoPlayer = document.getElementById("videoPlayer");
  const videoFile = document.getElementById("video").files[0];
  const videoSource = document.getElementById("videoSource");
  videoSource.src = URL.createObjectURL(videoFile);  
  videoPlayer.load();
  videoPlayer.play(); 

  const response = await fetch("/upload", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  
  if (response.ok) {
    
    videoPlayer.src = data.video; // Set the video source to the processed video
    videoPlayer.load();
    videoPlayer.play();

    // Populate chapters
    console.log(data.chapters);
    
    const chapterList = document.getElementById("playlist");
    chapterList.innerHTML = ""; // Clear old chapters
    data.chapters.forEach((chapter) => {
      const listItem = document.createElement("li");
      listItem.textContent = `${chapter.title} (${chapter.length}s)`;
      listItem.addEventListener("click", () => {
        videoPlayer.currentTime = chapter.startTime; // Seek to chapter start
        videoPlayer.play();
      });
      chapterList.appendChild(listItem);
    });
  } else {
    console.error(data.error);
  }
});
