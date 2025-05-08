Steps:

1. Install docker desktop 

2. Turn on the kubernnetes plugin

3. setup kubectl on laptop

4. git clone this repo and build the docker files cd cloud-demo

5. docker build -t msrit-frontend -f Dockerfile.frontend . 

6. docker build -t msrit-backend -f Dockerfile.backend .

7. docker pull ollama/ollama:latest

8. kubectl apply -f msrit-chatbot.yaml

9. kubectl get pods -n msrit-chatbot

10. kubectl get svc -n msrit-chatbot   

11. run the below 2 commands on 2 different terminals:

    10.1 kubectl port-forward -n msrit-chatbot deployment/backend 5000:5000 

    10.2 kubectl port-forward -n msrit-chatbot deployment/frontend 8080:8080 

12. open http://localhost:8080 in browser

13. Run below to delete the resources: 

    12.1 kubectl delete -f msrit-chatbot.yaml
