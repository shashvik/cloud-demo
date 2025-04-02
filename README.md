Steps:

1. Install docker desktop 

2. Turn on the kubernnetes plugin

3. setup kubectl on laptop

4. git clone this repo

5. run kubectl apply -f msrit-chatbot.yaml

6. run kubectl get pods -n msrit-chatbot

7. run kubectl get svc -n msrit-chatbot   

8. run kubectl port-forward -n msrit-chatbot deployment/backend 5000:5000 and kubectl port-forward -n msrit-chatbot deployment/frontend 8080:8080 on 2 different terminal

9. open http://localhost:8080 in browser

10. run kubectl delete -f msrit-chatbot.yaml
