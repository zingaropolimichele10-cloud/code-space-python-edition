import { quizzes } from '../js/missions/quiz.mjs';

// Interagisce con la stessa domanda mostrata agli studenti, senza alterare il gioco.
export function answerQuiz(evaluate, document = 'window.document') {
  return evaluate(`(() => {
    const doc = ${document};
    const id = Number(doc.querySelector('#control-center').dataset.mission);
    const quiz = doc.querySelector('.mission-quiz');
    const answers = ${JSON.stringify(Object.fromEntries(Object.entries(quizzes).map(([id, question]) => [id, question[2]])))};
    if (!quiz.hidden && id in answers) quiz.querySelectorAll('button')[answers[id]].click();
  })()`);
}
