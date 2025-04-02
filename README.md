
Using the ingress:

Steps:

1. Install docker desktop 

2. Turn on the kubernnetes plugin

3. setup kubectl on laptop

4. git clone this repo and build the docker files cd cloud-demo

5. docker build -t msrit-frontend -f Dockerfile.frontend . 

6. docker build -t msrit-backend -f Dockerfile.backend .

7. kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

8. kubectl apply -f k8s_with_ingress.yaml

9. kubectl get pods -n msrit-chatbot

10. kubectl get svc -n msrit-chatbot  

11. sudo kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 80:80

12. open http://localhost:8080 in browser

13. Run below to delete the resources: 

    12.1 kubectl delete -f k8s_with_ingress.yaml

