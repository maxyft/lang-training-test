import { pushTasksToHistory, registerHandlers, restoreState } from '@/utils'
import { DOMTaskRender } from '@/classes'
import { ITrainingClass } from '@/types'

(function() {
    window.addEventListener('DOMContentLoaded', async () => {
        const training: ITrainingClass = await restoreState()
        const render: DOMTaskRender = new DOMTaskRender()
        render.renderTraining(training)

        registerHandlers(training, render)
        pushTasksToHistory(training)
    })
})()