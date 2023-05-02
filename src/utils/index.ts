import { IResult, ITrainingClass, ITrainingState } from '@/types'
import { DOMTaskRender, Training } from '@/classes'

function getStateFromLS(): ITrainingState | null {
    const lastTrainingStateString: string | null = localStorage.getItem('last-training-state')

    return lastTrainingStateString ? JSON.parse(lastTrainingStateString) as ITrainingState : null
}

export function pushTasksToHistory(training: ITrainingClass): void {

    training.tasks.forEach((t, i) => {
        if (t.isComplete || t.isError) {
            i === 0
                ? window.history.replaceState({ task: i }, '', `?task-${i}`)
                : window.history.pushState({ task: i }, '', `?task-${i}`)
        }
    })

    window.history.pushState({ task: training.currentTaskIndex }, '', `?task-${training.currentTaskIndex}`)
}

export function wait(time: number): Promise<void> {
    return new Promise(res => {
        setTimeout(res, time)
    })
}

export function restoreState(): Promise<ITrainingClass> {
    const lastTraining = getStateFromLS()

    return new Promise(resolve => {
        if (lastTraining) {
            const restoreModalContainer: HTMLElement = document.querySelector('#restore') as HTMLElement
            const restoreModalBtnOk: HTMLElement = document.querySelector('#restore_btn_ok') as HTMLElement
            const restoreModalBtnCancel: HTMLElement = document.querySelector('#restore_btn_cancel') as HTMLElement
            restoreModalContainer.style.display = 'block'

            restoreModalBtnOk.addEventListener('click', () => {
                restoreModalContainer.style.display = 'none'
                resolve(new Training(lastTraining))
            })

            restoreModalBtnCancel.addEventListener('click', () => {
                restoreModalContainer.style.display = 'none'
                localStorage.removeItem('last-training-state')
                resolve(new Training())
            })

            return
        }

        resolve(new Training())
    })
}

export function randomizeEntity(maxRandomIndex: number, iterationsCount: number): Array<number> {
    const randomized: Array<number> = []

    for (let i = 0; i < iterationsCount; i++) {
        const random: number = Math.floor(Math.random() * maxRandomIndex)
        if (randomized.indexOf(random) === -1) {
            randomized.push(random)
        } else {
            i -= 1
        }
    }

    return randomized
}

export function registerHandlers(state: ITrainingClass, render: DOMTaskRender) {
    window.addEventListener('keydown', async (e) => {
        const key = e.key.toLowerCase()
        const isValidKey = /^[a-zA-Z]+$/.test(key)
        if (!isValidKey || render.isPending) return

        const result: IResult = state.handleInput(key)
        result.trainingComplete
            ? localStorage.removeItem('last-training-state')
            : localStorage.setItem('last-training-state', JSON.stringify(state))

        await render.handleChange(state, result, key)

        if ((result.taskError || result.taskComplete) && !result.trainingComplete) {
            window.history.pushState({ task: state.currentTaskIndex }, '', `?task-${state.currentTaskIndex}`)
        }
    })

    window.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement
        const isTargetInsideLetters = target.closest('#letters')
        if (!target.dataset.letter || !isTargetInsideLetters || render.isPending) return

        const key = target.dataset.letter
        const index = target.dataset.index
        const result: IResult = state.handleInput(key)

        result.trainingComplete
            ? localStorage.removeItem('last-training-state')
            : localStorage.setItem('last-training-state', JSON.stringify(state))

        await render.handleChange(state, result, key, index)

        if ((result.taskError || result.taskComplete) && !result.trainingComplete) {
            window.history.pushState({ task: state.currentTaskIndex }, '', `?task-${state.currentTaskIndex}`)
        }
    })

    window.addEventListener('popstate', (e) => {
        const taskIndex = e.state.task
        render.renderTraining(state, taskIndex)
    })
}

export const words = [
    'apple',
    'function',
    'timeout',
    'task',
    'application',
    'data',
    'tragedy',
    'sun',
    'symbol',
    'button',
    'software',
]