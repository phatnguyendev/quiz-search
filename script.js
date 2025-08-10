let quizData = [];

fetch('all_questions_list.json')
  .then(response => response.json())
  .then(data => quizData = data);

document.getElementById('searchBox').addEventListener('input', function () {
  const keyword = this.value.toLowerCase();
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  const results = quizData.filter(q => q.question.toLowerCase().includes(keyword));

  results.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = `<div class="alert alert-success" role="alert"><b>Đáp án: ${item.answer} </b></div>`;
    resultsDiv.appendChild(div);
  });

  if (results.length === 0 && keyword) {
    resultsDiv.innerHTML = 'Không tìm thấy câu hỏi nào.';
  }
});
