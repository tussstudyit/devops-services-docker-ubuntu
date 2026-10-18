pipeline {
    agent any

    options {
        // Chi checkout mot lan tai stage Checkout Code.
        skipDefaultCheckout(true)

        // Tranh hai lan build/deploy chay cung luc.
        disableConcurrentBuilds()
    }

    environment {
        DOCKER_HUB_REPO = 'iragad/greenchat-app'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                echo 'Pulling source code from GitHub...'
                checkout scm
            }
        }

        stage('2. Verify Configuration') {
            steps {
                // Kiem tra file va cau hinh, chua phai unit test.
                sh 'test -f app/Dockerfile'
                sh 'test -f docker-compose.yml'
                sh 'docker compose -p greenchat-nhom config --quiet'
            }
        }

        stage('3. Build Docker Image') {
            steps {
                echo "Building image: ${DOCKER_HUB_REPO}:${IMAGE_TAG}"

                sh '''
                    docker build \
                        -t "$DOCKER_HUB_REPO:$IMAGE_TAG" \
                        -t "$DOCKER_HUB_REPO:latest" \
                        ./app
                '''
            }
        }

        stage('4. Push to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: env.DOCKER_CREDENTIALS_ID,
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh '''
                        set +x
                        printf "%s" "$DOCKER_PASS" |
                            docker login -u "$DOCKER_USER" --password-stdin
                    '''

                    sh 'docker push "$DOCKER_HUB_REPO:$IMAGE_TAG"'
                    sh 'docker push "$DOCKER_HUB_REPO:latest"'
                }
            }
        }

        stage('5. Deploy Production') {
            steps {
                echo 'Updating GreenChat application on Ubuntu...'

                // Dung dung project da khoi tao tren Ubuntu.
                sh 'docker compose -p greenchat-nhom pull app'

                // Chi cap nhat App, khong tao lai MySQL va Nginx.
                sh 'docker compose -p greenchat-nhom up -d --no-deps --no-build app'
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }

        success {
            echo 'Build, push and container update completed. Verify GreenChat in the browser.'
        }

        failure {
            echo 'Pipeline failed. Check Console Output.'
        }
    }
}
