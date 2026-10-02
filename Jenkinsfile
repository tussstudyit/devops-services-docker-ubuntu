pipeline {
    agent any

    environment {
        // Cấu hình thông tin Docker Hub
        DOCKER_HUB_REPO = 'tussstudyit/greenchat-app'
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

        stage('2. Lint & Verify') {
            steps {
                echo 'Checking codebase files...'
                sh 'ls -la'
                sh 'test -f app/Dockerfile'
                sh 'test -f docker-compose.yml'
            }
        }

        stage('3. Build Docker Image') {
            steps {
                script {
                    echo "Building Docker Image: ${DOCKER_HUB_REPO}:${IMAGE_TAG}"
                    sh "docker build -t ${DOCKER_HUB_REPO}:${IMAGE_TAG} -t ${DOCKER_HUB_REPO}:latest ./app"
                }
            }
        }

        stage('4. Push to Docker Hub') {
            steps {
                script {
                    echo "Pushing image to Docker Hub..."
                    withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh "echo \${DOCKER_PASS} | docker login -u \${DOCKER_USER} --password-stdin"
                        sh "docker push ${DOCKER_HUB_REPO}:${IMAGE_TAG}"
                        sh "docker push ${DOCKER_HUB_REPO}:latest"
                    }
                }
            }
        }

        stage('5. Deploy Production') {
            steps {
                script {
                    echo 'Deploying application stack on Ubuntu Server...'
                    sh 'docker compose pull app'
                    sh 'docker compose up -d --no-deps app'
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
        success {
            echo 'Pipeline executed successfully! Application is live.'
        }
        failure {
            echo 'Pipeline failed. Please check build logs.'
        }
    }
}
