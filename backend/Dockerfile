FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY *.csproj .

# Patch framework target before restore
RUN sed -i 's/net10.0/net9.0/g' *.csproj && \
    dotnet restore

COPY . .

# Patch again after copy in case any other files reference net10
RUN sed -i 's/net10.0/net9.0/g' *.csproj && \
    dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "HospitalQueue.dll"]